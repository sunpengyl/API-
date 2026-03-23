import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../shared/database';
import { logger } from '../../shared/logger';
import { InspectionResult, InspectionTask } from '../../types/models';
import { AlertService } from '../alert/alert.service';
import { TaskRepository } from '../tasks/task.repository';
import { FieldValidator } from '../validator/field.validator';
import { ResultRepository } from './result.repository';

export class ExecutorService {
  private readonly resultRepository: ResultRepository;
  private readonly fieldValidator: FieldValidator;
  private readonly taskRepository: TaskRepository;

  constructor() {
    this.resultRepository = new ResultRepository();
    this.fieldValidator = new FieldValidator();
    this.taskRepository = new TaskRepository();
  }

  async executeInspection(task: InspectionTask): Promise<InspectionResult> {
    const executionLock = await this.acquireExecutionLock(task.id);
    if (!executionLock) {
      logger.warn(`任务 ${task.name} (${task.id}) 执行被跳过：另一个实例正在执行同一任务`);
      return {
        id: uuidv4(),
        taskId: task.id,
        executedAt: new Date(),
        success: false,
        responseTime: 0,
        validationResults: [],
        error: {
          code: 'EXECUTION_SKIPPED',
          message: '任务正在被其他实例执行，已跳过本次重复触发',
        },
      };
    }

    const startTime = Date.now();
    const result: InspectionResult = {
      id: uuidv4(),
      taskId: task.id,
      executedAt: new Date(),
      success: false,
      responseTime: 0,
      validationResults: [],
    };

    try {
      logger.info(`开始执行巡检任务: ${task.name} (${task.id})`);

      const requestConfig: AxiosRequestConfig = {
        url: task.apiEndpoint.url,
        method: task.apiEndpoint.method,
        timeout: task.apiEndpoint.timeout,
        headers: task.apiEndpoint.headers || {},
        params: task.apiEndpoint.queryParams || {},
        data: task.apiEndpoint.body || undefined,
        validateStatus: () => true,
      };

      const response: AxiosResponse = await axios(requestConfig);
      result.responseTime = Date.now() - startTime;
      result.statusCode = response.status;
      result.response = response.data;
      result.success = response.status >= 200 && response.status < 300;

      if (!result.success) {
        result.error = {
          code: `HTTP_${response.status}`,
          message: `HTTP 请求返回非成功状态码: ${response.status}`,
        };
      } else if (task.validationRules && task.validationRules.length > 0) {
        result.validationResults = this.fieldValidator.validateAll(response.data, task.validationRules);

        const requiredFailed = result.validationResults.some(
          (validationResult) =>
            !validationResult.passed &&
            task.validationRules.find((rule) => rule.id === validationResult.ruleId)?.required
        );

        if (requiredFailed) {
          result.success = false;
          result.error = {
            code: 'VALIDATION_FAILED',
            message: '必填字段校验未通过',
          };
        }

        logger.info(
          `字段校验完成: ${result.validationResults.length} 条规则, 通过率 ${this.fieldValidator
            .calculatePassRate(result.validationResults)
            .toFixed(2)}%`
        );
      }

      logger.info(
        `巡检任务执行完成: ${task.name}, 状态码 ${result.statusCode}, 响应时间 ${result.responseTime}ms`
      );
    } catch (error: any) {
      result.responseTime = Date.now() - startTime;
      result.success = false;

      if (error.code === 'ECONNABORTED') {
        result.error = {
          code: 'TIMEOUT',
          message: `请求超时 (${task.apiEndpoint.timeout}ms)`,
          stack: error.stack,
        };
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        result.error = {
          code: 'CONNECTION_FAILED',
          message: `连接失败: ${error.message}`,
          stack: error.stack,
        };
      } else {
        result.error = {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message || '未知错误',
          stack: error.stack,
        };
      }

      logger.error(`巡检任务执行失败: ${task.name}`, error);
    }

    try {
      await this.recordResult(result);
      await this.updateTaskExecutionTime(task.id, result.executedAt);

      try {
        await new AlertService().checkAndTriggerAlerts(task.id);
      } catch (error) {
        logger.error('告警检查失败', error);
      }

      return result;
    } finally {
      await this.releaseExecutionLock(executionLock, task.id);
    }
  }

  async recordResult(result: InspectionResult): Promise<void> {
    try {
      await this.resultRepository.create(result);
      logger.info(`巡检结果已保存: ${result.id}`);
    } catch (error) {
      logger.error('保存巡检结果失败', error);
      throw error;
    }
  }

  async triggerTask(taskId: string, task: InspectionTask): Promise<InspectionResult> {
    logger.info(`手动触发任务执行: ${task.name} (${taskId})`);
    return this.executeInspection(task);
  }

  private async acquireExecutionLock(taskId: string): Promise<PoolConnection | null> {
    const connection = await getDatabase().getConnection();

    try {
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT GET_LOCK(?, 0) AS acquired',
        [this.getExecutionLockName(taskId)]
      );

      if (rows[0]?.acquired !== 1) {
        connection.release();
        return null;
      }

      return connection;
    } catch (error) {
      connection.release();
      logger.error(`获取任务执行锁失败: ${taskId}`, error);
      throw error;
    }
  }

  private async releaseExecutionLock(connection: PoolConnection, taskId: string): Promise<void> {
    try {
      await connection.query('SELECT RELEASE_LOCK(?)', [this.getExecutionLockName(taskId)]);
    } catch (error) {
      logger.error(`释放任务执行锁失败: ${taskId}`, error);
    } finally {
      connection.release();
    }
  }

  private getExecutionLockName(taskId: string): string {
    return `inspection_task_lock_${taskId}`;
  }

  private async updateTaskExecutionTime(taskId: string, executedAt: Date): Promise<void> {
    try {
      await this.taskRepository.update(taskId, { lastExecutedAt: executedAt });
    } catch (error) {
      logger.error(`回写任务最后执行时间失败: ${taskId}`, error);
    }
  }
}

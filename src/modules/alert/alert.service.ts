import { AlertRepository } from './alert.repository';
import { ResultRepository } from '../executor/result.repository';
import { TaskRepository } from '../tasks/task.repository';
import { Alert, InspectionTask } from '../../types/models';
import { logger } from '../../shared/logger';
import { v4 as uuidv4 } from 'uuid';

export class AlertService {
  private alertRepository: AlertRepository;
  private resultRepository: ResultRepository;
  private taskRepository: TaskRepository;

  constructor() {
    this.alertRepository = new AlertRepository();
    this.resultRepository = new ResultRepository();
    this.taskRepository = new TaskRepository();
  }

  /**
   * 检查任务执行结果并触发告警
   */
  async checkAndTriggerAlerts(taskId: string): Promise<void> {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task || !task.alertRules || task.alertRules.length === 0) {
        return;
      }

      for (const rule of task.alertRules) {
        await this.checkAlertRule(task, rule);
      }
    } catch (error) {
      logger.error(`检查告警失败: ${taskId}`, error);
    }
  }

  /**
   * 检查单个告警规则
   */
  private async checkAlertRule(task: InspectionTask, rule: any): Promise<void> {
    switch (rule.type) {
      case 'consecutive_failure':
        await this.checkConsecutiveFailure(task, rule);
        break;
      case 'response_time_exceeded':
        await this.checkResponseTimeExceeded(task, rule);
        break;
      case 'validation_failed':
        await this.checkValidationFailed(task, rule);
        break;
      default:
        logger.warn(`未知的告警规则类型: ${rule.type}`);
    }
  }

  /**
   * 检查连续失败告警
   */
  private async checkConsecutiveFailure(task: InspectionTask, rule: any): Promise<void> {
    const consecutiveFailures = await this.resultRepository.getConsecutiveFailures(task.id);
    const threshold = rule.threshold || 3;

    if (consecutiveFailures >= threshold) {
      // 检查是否已有活跃告警
      const existingAlert = await this.alertRepository.findActiveAlert(task.id, rule.id);
      
      if (!existingAlert) {
        // 创建新告警
        const alert: Alert = {
          id: uuidv4(),
          taskId: task.id,
          ruleId: rule.id,
          type: 'consecutive_failure',
          severity: rule.severity || 'error',
          title: `任务连续失败 ${consecutiveFailures} 次`,
          message: `任务 "${task.name}" 已连续失败 ${consecutiveFailures} 次，超过阈值 ${threshold}`,
          details: {
            consecutiveFailures,
            threshold,
            taskName: task.name,
          },
          triggeredAt: new Date(),
          status: 'active',
          notificationChannels: rule.channels || [],
        };

        await this.alertRepository.create(alert);
        logger.warn(`触发连续失败告警: ${task.name} (${consecutiveFailures}次)`);

        // 发送通知
        await this.sendNotification(alert);
      }
    } else {
      // 如果连续失败次数低于阈值，解决已有告警
      const existingAlert = await this.alertRepository.findActiveAlert(task.id, rule.id);
      if (existingAlert) {
        await this.resolveAlert(existingAlert.id);
        logger.info(`解决连续失败告警: ${task.name}`);
      }
    }
  }

  /**
   * 检查响应时间超时告警
   */
  private async checkResponseTimeExceeded(task: InspectionTask, rule: any): Promise<void> {
    const latestResult = await this.resultRepository.getLatestResult(task.id);
    if (!latestResult || !latestResult.success) {
      return;
    }

    const threshold = rule.threshold || 5000;
    if (latestResult.responseTime > threshold) {
      const alert: Alert = {
        id: uuidv4(),
        taskId: task.id,
        ruleId: rule.id,
        type: 'response_time_exceeded',
        severity: rule.severity || 'warning',
        title: '响应时间超过阈值',
        message: `任务 "${task.name}" 响应时间 ${latestResult.responseTime}ms 超过阈值 ${threshold}ms`,
        details: {
          responseTime: latestResult.responseTime,
          threshold,
          taskName: task.name,
        },
        triggeredAt: new Date(),
        status: 'active',
        notificationChannels: rule.channels || [],
      };

      await this.alertRepository.create(alert);
      logger.warn(`触发响应时间告警: ${task.name} (${latestResult.responseTime}ms)`);

      await this.sendNotification(alert);
    }
  }

  /**
   * 检查字段校验失败告警
   */
  private async checkValidationFailed(task: InspectionTask, rule: any): Promise<void> {
    const latestResult = await this.resultRepository.getLatestResult(task.id);
    if (!latestResult || !latestResult.validationResults || latestResult.validationResults.length === 0) {
      return;
    }

    const failedValidations = latestResult.validationResults.filter(v => !v.passed);
    if (failedValidations.length > 0) {
      const alert: Alert = {
        id: uuidv4(),
        taskId: task.id,
        ruleId: rule.id,
        type: 'validation_failed',
        severity: rule.severity || 'warning',
        title: '字段校验失败',
        message: `任务 "${task.name}" 有 ${failedValidations.length} 个字段校验失败`,
        details: {
          failedCount: failedValidations.length,
          failedValidations: failedValidations.map(v => ({
            ruleId: v.ruleId,
            message: v.message,
          })),
          taskName: task.name,
        },
        triggeredAt: new Date(),
        status: 'active',
        notificationChannels: rule.channels || [],
      };

      await this.alertRepository.create(alert);
      logger.warn(`触发字段校验失败告警: ${task.name}`);

      await this.sendNotification(alert);
    }
  }

  /**
   * 解决告警
   */
  async resolveAlert(alertId: string): Promise<void> {
    await this.alertRepository.resolve(alertId);
    logger.info(`告警已解决: ${alertId}`);
  }

  /**
   * 发送通知
   */
  private async sendNotification(alert: Alert): Promise<void> {
    // TODO: 实现实际的通知发送逻辑（邮件、Webhook等）
    logger.info(`发送告警通知: ${alert.title}`, {
      channels: alert.notificationChannels,
      severity: alert.severity,
    });
  }

  /**
   * 获取活跃告警列表
   */
  async getActiveAlerts(taskId?: string): Promise<Alert[]> {
    return await this.alertRepository.findActiveAlerts(taskId);
  }

  /**
   * 获取告警历史
   */
  async getAlertHistory(filter: {
    taskId?: string;
    status?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: Alert[]; total: number }> {
    return await this.alertRepository.findAll(filter);
  }
}

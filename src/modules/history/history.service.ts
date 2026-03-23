import { ResultRepository, ResultFilter } from '../executor/result.repository';
import { TaskRepository } from '../tasks/task.repository';
import { InspectionResult } from '../../types/models';

export interface HistoryQuery {
  taskId?: string;
  taskIds?: string[];
  success?: boolean;
  startTime?: string; // ISO 8601 格式
  endTime?: string;
  page?: number;
  pageSize?: number;
}

export interface HistoryResponse {
  results: InspectionResult[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface TaskSummary {
  taskId: string;
  taskName: string;
  lastExecutedAt?: Date;
  lastStatus?: boolean;
  statistics: {
    total: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    avgResponseTime: number;
  };
}

export class HistoryService {
  private resultRepository: ResultRepository;
  private taskRepository: TaskRepository;

  constructor() {
    this.resultRepository = new ResultRepository();
    this.taskRepository = new TaskRepository();
  }

  /**
   * 查询执行历史
   */
  async queryHistory(query: HistoryQuery): Promise<HistoryResponse> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const filter: ResultFilter = {
      taskId: query.taskId,
      taskIds: query.taskIds,
      success: query.success,
      startTime: query.startTime ? new Date(query.startTime) : undefined,
      endTime: query.endTime ? new Date(query.endTime) : undefined,
      limit: pageSize,
      offset,
    };

    const { results, total } = await this.resultRepository.findAll(filter);

    return {
      results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取任务执行摘要
   */
  async getTaskSummary(taskId: string, days: number = 7): Promise<TaskSummary> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    const endTime = new Date();
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - days);

    // 获取最新执行记录
    const latestResult = await this.resultRepository.getLatestResult(taskId);

    // 获取统计数据
    const statistics = await this.resultRepository.getStatistics(taskId, startTime, endTime);

    return {
      taskId: task.id,
      taskName: task.name,
      lastExecutedAt: latestResult?.executedAt,
      lastStatus: latestResult?.success,
      statistics: statistics || {
        total: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgResponseTime: 0,
      },
    };
  }

  /**
   * 获取多个任务的摘要
   */
  async getTasksSummary(taskIds?: string[], days: number = 7): Promise<TaskSummary[]> {
    let tasks;
    
    if (taskIds && taskIds.length > 0) {
      // 查询指定任务
      tasks = await Promise.all(
        taskIds.map(id => this.taskRepository.findById(id))
      );
      tasks = tasks.filter(t => t !== null);
    } else {
      // 查询所有任务
      tasks = await this.taskRepository.findAll({});
    }

    const summaries = await Promise.all(
      tasks.map(task => this.getTaskSummary(task!.id, days))
    );

    return summaries;
  }

  /**
   * 获取任务详细统计
   */
  async getTaskStatistics(taskId: string, startTime: Date, endTime: Date) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    const statistics = await this.resultRepository.getStatistics(taskId, startTime, endTime);
    const consecutiveFailures = await this.resultRepository.getConsecutiveFailures(taskId);

    return {
      taskId: task.id,
      taskName: task.name,
      timeRange: {
        startTime,
        endTime,
      },
      statistics: statistics || {
        total: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
      },
      consecutiveFailures,
    };
  }
}

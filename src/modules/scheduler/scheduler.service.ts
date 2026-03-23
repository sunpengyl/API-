import cron from 'node-cron';
import { logger } from '../../shared/logger';
import { TaskRepository } from '../tasks/task.repository';
import { ExecutorService } from '../executor/executor.service';
import { InspectionTask } from '../../types/models';

interface ScheduledJob {
  taskId: string;
  cronJob: cron.ScheduledTask;
}

export class SchedulerService {
  private jobs: Map<string, ScheduledJob> = new Map();
  private taskRepository: TaskRepository;
  private executorService: ExecutorService;
  private maxConcurrentTasks: number;
  private runningTasks: Set<string> = new Set();

  constructor(maxConcurrentTasks: number = 10) {
    this.taskRepository = new TaskRepository();
    this.executorService = new ExecutorService();
    this.maxConcurrentTasks = maxConcurrentTasks;
  }

  /**
   * 启动调度器 - 加载所有已启用的任务
   */
  async start(): Promise<void> {
    logger.info('调度器启动中...');
    
    try {
      // 获取所有已启用的任务
      const tasks = await this.taskRepository.findAll({ enabled: true });
      
      for (const task of tasks) {
        await this.scheduleTask(task);
      }
      
      logger.info(`调度器启动成功，已加载 ${tasks.length} 个任务`);
    } catch (error) {
      logger.error('调度器启动失败', error);
      throw error;
    }
  }

  /**
   * 停止调度器 - 停止所有任务
   */
  async stop(): Promise<void> {
    logger.info('调度器停止中...');
    
    for (const [taskId, job] of this.jobs.entries()) {
      job.cronJob.stop();
      this.jobs.delete(taskId);
    }
    
    logger.info('调度器已停止');
  }

  /**
   * 调度单个任务
   */
  async scheduleTask(task: InspectionTask): Promise<void> {
    // 如果任务已经在调度中，先取消
    if (this.jobs.has(task.id)) {
      this.unscheduleTask(task.id);
    }

    // 如果任务未启用，不调度
    if (!task.enabled) {
      logger.info(`任务 ${task.name} (${task.id}) 未启用，跳过调度`);
      return;
    }

    try {
      // 生成 cron 表达式
      const cronExpression = this.generateCronExpression(task.frequency);
      
      // 创建定时任务
      const cronJob = cron.schedule(cronExpression, async () => {
        await this.executeTask(task.id);
      });

      // 保存任务引用
      this.jobs.set(task.id, {
        taskId: task.id,
        cronJob,
      });

      logger.info(`任务 ${task.name} (${task.id}) 已调度，执行频率: ${cronExpression}`);
    } catch (error) {
      logger.error(`任务 ${task.name} (${task.id}) 调度失败`, error);
      throw error;
    }
  }

  /**
   * 取消任务调度
   */
  unscheduleTask(taskId: string): void {
    const job = this.jobs.get(taskId);
    if (job) {
      job.cronJob.stop();
      this.jobs.delete(taskId);
      logger.info(`任务 ${taskId} 已取消调度`);
    }
  }

  /**
   * 重新调度任务（任务更新后调用）
   */
  async rescheduleTask(taskId: string): Promise<void> {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        logger.warn(`任务 ${taskId} 不存在，无法重新调度`);
        return;
      }

      await this.scheduleTask(task);
    } catch (error) {
      logger.error(`任务 ${taskId} 重新调度失败`, error);
      throw error;
    }
  }

  /**
   * 手动触发任务执行
   */
  async triggerTask(taskId: string): Promise<void> {
    await this.executeTask(taskId);
  }

  /**
   * 执行任务
   */
  private async executeTask(taskId: string): Promise<void> {
    // 检查并发限制
    if (this.runningTasks.size >= this.maxConcurrentTasks) {
      logger.warn(`任务 ${taskId} 执行被跳过：已达到最大并发数 ${this.maxConcurrentTasks}`);
      return;
    }

    // 检查任务是否已在执行中
    if (this.runningTasks.has(taskId)) {
      logger.warn(`任务 ${taskId} 执行被跳过：任务正在执行中`);
      return;
    }

    this.runningTasks.add(taskId);

    try {
      logger.info(`开始执行任务 ${taskId}`);
      
      // 获取任务详情
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        logger.error(`任务 ${taskId} 不存在`);
        return;
      }

      // 执行巡检
      await this.executorService.executeInspection(task);
      logger.info(`任务 ${taskId} 执行完成`);
    } catch (error) {
      logger.error(`任务 ${taskId} 执行失败`, error);
    } finally {
      this.runningTasks.delete(taskId);
    }
  }

  /**
   * 生成 cron 表达式
   */
  private generateCronExpression(frequency: {
    type: 'minute' | 'hour' | 'day';
    interval: number;
    cron?: string;
  }): string {
    // 如果提供了自定义 cron 表达式，直接使用
    if (frequency.cron) {
      return frequency.cron;
    }

    // 根据频率类型生成 cron 表达式
    switch (frequency.type) {
      case 'minute':
        // 每 N 分钟执行一次
        return `*/${frequency.interval} * * * *`;
      
      case 'hour':
        // 每 N 小时执行一次（在每小时的第 0 分钟执行）
        return `0 */${frequency.interval} * * *`;
      
      case 'day':
        // 每 N 天执行一次（在每天的 00:00 执行）
        return `0 0 */${frequency.interval} * *`;
      
      default:
        throw new Error(`不支持的频率类型: ${frequency.type}`);
    }
  }

  /**
   * 获取当前调度状态
   */
  getStatus(): {
    totalScheduled: number;
    runningTasks: number;
    scheduledTasks: string[];
  } {
    return {
      totalScheduled: this.jobs.size,
      runningTasks: this.runningTasks.size,
      scheduledTasks: Array.from(this.jobs.keys()),
    };
  }
}

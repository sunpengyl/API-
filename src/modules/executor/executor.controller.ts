import { Request, Response } from 'express';
import { ExecutorService } from './executor.service';
import { ResultRepository } from './result.repository';
import { TaskService } from '../tasks/task.service';
import { logger } from '../../shared/logger';

export class ExecutorController {
  private executorService: ExecutorService;
  private resultRepository: ResultRepository;
  private taskService: TaskService;

  constructor() {
    this.executorService = new ExecutorService();
    this.resultRepository = new ResultRepository();
    this.taskService = new TaskService();
  }

  /**
   * 手动触发任务执行
   */
  triggerTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // 检查任务是否存在
      const task = await this.taskService.getTask(id);
      if (!task) {
        res.status(404).json({ error: '任务不存在' });
        return;
      }

      // 检查权限
      const hasAccess = await this.taskService.checkOwnership(id, userId, userRole);
      if (!hasAccess) {
        res.status(403).json({ error: '无权执行此任务' });
        return;
      }

      // 执行任务
      const result = await this.executorService.triggerTask(id, task);

      res.json({
        message: '任务执行完成',
        result: {
          id: result.id,
          success: result.success,
          statusCode: result.statusCode,
          responseTime: result.responseTime,
          executedAt: result.executedAt,
        },
      });
    } catch (error: any) {
      logger.error('手动触发任务失败', error);
      res.status(500).json({ error: error.message || '任务执行失败' });
    }
  };

  /**
   * 获取任务执行历史
   */
  getTaskResults = async (req: Request, res: Response): Promise<void> => {
    try {
      const { taskId } = req.params;
      const { success, startTime, endTime, page = 1, pageSize = 20 } = req.query;

      const filter: any = {
        limit: parseInt(pageSize as string),
        offset: (parseInt(page as string) - 1) * parseInt(pageSize as string),
      };

      if (success !== undefined) {
        filter.success = success === 'true';
      }

      if (startTime) {
        filter.startTime = new Date(startTime as string);
      }

      if (endTime) {
        filter.endTime = new Date(endTime as string);
      }

      const { results, total } = await this.resultRepository.findByTaskId(taskId, filter);

      res.json({
        results,
        pagination: {
          total,
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
          totalPages: Math.ceil(total / parseInt(pageSize as string)),
        },
      });
    } catch (error: any) {
      logger.error('获取执行历史失败', error);
      res.status(500).json({ error: '获取执行历史失败' });
    }
  };

  /**
   * 获取单个执行结果详情
   */
  getResult = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.resultRepository.findById(id);
      if (!result) {
        res.status(404).json({ error: '执行结果不存在' });
        return;
      }

      res.json(result);
    } catch (error: any) {
      logger.error('获取执行结果失败', error);
      res.status(500).json({ error: '获取执行结果失败' });
    }
  };

  /**
   * 获取任务统计信息
   */
  getTaskStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { taskId } = req.params;
      const { startTime, endTime } = req.query;

      // 默认查询最近24小时
      const end = endTime ? new Date(endTime as string) : new Date();
      const start = startTime
        ? new Date(startTime as string)
        : new Date(end.getTime() - 24 * 60 * 60 * 1000);

      const statistics = await this.resultRepository.getStatistics(taskId, start, end);

      if (!statistics) {
        res.json({
          total: 0,
          successCount: 0,
          failureCount: 0,
          successRate: 0,
          avgResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
        });
        return;
      }

      res.json(statistics);
    } catch (error: any) {
      logger.error('获取任务统计失败', error);
      res.status(500).json({ error: '获取任务统计失败' });
    }
  };
}

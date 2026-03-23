import { Request, Response } from 'express';
import { TaskService } from './task.service';
import { logger } from '../../shared/logger';

export class TaskController {
  private service: TaskService;

  constructor() {
    this.service = new TaskService();
  }

  // 创建任务
  createTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: '未授权' });
        return;
      }

      const taskId = await this.service.createTask(req.body, userId);
      res.status(201).json({ id: taskId, message: '任务创建成功' });
    } catch (error: any) {
      logger.error('创建任务失败', error);
      res.status(400).json({ error: error.message || '创建任务失败' });
    }
  };

  // 获取任务详情
  getTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      const task = await this.service.getTask(id, userId, userRole);
      if (!task) {
        res.status(404).json({ error: '任务不存在或无权访问' });
        return;
      }

      res.json(task);
    } catch (error: any) {
      logger.error('获取任务失败', error);
      res.status(500).json({ error: '获取任务失败' });
    }
  };

  // 获取任务列表
  listTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      const filter: any = {};

      // 名称筛选
      if (req.query.name) {
        filter.name = req.query.name as string;
      }

      // 状态筛选
      if (req.query.enabled !== undefined) {
        filter.enabled = req.query.enabled === 'true';
      }

      // 标签筛选
      if (req.query.tags) {
        filter.tags = (req.query.tags as string).split(',');
      }

      const tasks = await this.service.listTasks(filter, userId, userRole);
      res.json(tasks);
    } catch (error: any) {
      logger.error('获取任务列表失败', error);
      res.status(500).json({ error: '获取任务列表失败' });
    }
  };

  // 更新任务
  updateTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      await this.service.updateTask(id, req.body, userId, userRole);
      res.json({ message: '任务更新成功' });
    } catch (error: any) {
      logger.error('更新任务失败', error);
      res.status(400).json({ error: error.message || '更新任务失败' });
    }
  };

  // 删除任务
  deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      await this.service.deleteTask(id, userId, userRole);
      res.json({ message: '任务删除成功' });
    } catch (error: any) {
      logger.error('删除任务失败', error);
      res.status(400).json({ error: error.message || '删除任务失败' });
    }
  };

  // 启用/禁用任务
  toggleTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      await this.service.toggleTask(id, enabled, userId, userRole);
      res.json({ message: enabled ? '任务已启用' : '任务已禁用' });
    } catch (error: any) {
      logger.error('切换任务状态失败', error);
      res.status(400).json({ error: error.message || '切换任务状态失败' });
    }
  };

  // 批量启用/禁用任务
  batchToggleTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ids, enabled } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: '任务ID列表不能为空' });
        return;
      }

      await this.service.batchToggleTasks(ids, enabled);
      res.json({ message: `已${enabled ? '启用' : '禁用'}${ids.length}个任务` });
    } catch (error: any) {
      logger.error('批量切换任务状态失败', error);
      res.status(400).json({ error: error.message || '批量切换任务状态失败' });
    }
  };

  // 复制任务
  duplicateTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const newTaskId = await this.service.duplicateTask(id, userId);
      res.status(201).json({ id: newTaskId, message: '任务复制成功' });
    } catch (error: any) {
      logger.error('复制任务失败', error);
      res.status(400).json({ error: error.message || '复制任务失败' });
    }
  };
}

import { Request, Response } from 'express';
import { logger } from '../../shared/logger';

// 调度器实例将在 index.ts 中创建并注入
let schedulerInstance: any = null;

export const setSchedulerInstance = (scheduler: any) => {
  schedulerInstance = scheduler;
};

/**
 * 获取调度器状态
 */
export const getSchedulerStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!schedulerInstance) {
      res.status(503).json({ error: '调度器未启动' });
      return;
    }

    const status = schedulerInstance.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('获取调度器状态失败', error);
    res.status(500).json({ error: '获取调度器状态失败' });
  }
};

/**
 * 手动触发任务执行
 */
export const triggerTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    if (!schedulerInstance) {
      res.status(503).json({ error: '调度器未启动' });
      return;
    }

    await schedulerInstance.triggerTask(taskId);
    
    res.json({ message: '任务已触发执行' });
  } catch (error) {
    logger.error('触发任务执行失败', error);
    res.status(500).json({ error: '触发任务执行失败' });
  }
};

/**
 * 重新调度任务
 */
export const rescheduleTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    if (!schedulerInstance) {
      res.status(503).json({ error: '调度器未启动' });
      return;
    }

    await schedulerInstance.rescheduleTask(taskId);
    
    res.json({ message: '任务已重新调度' });
  } catch (error) {
    logger.error('重新调度任务失败', error);
    res.status(500).json({ error: '重新调度任务失败' });
  }
};

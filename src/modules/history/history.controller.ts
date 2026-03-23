import { Request, Response } from 'express';
import { HistoryService, HistoryQuery } from './history.service';
import { logger } from '../../shared/logger';

const historyService = new HistoryService();

/**
 * 查询执行历史
 */
export const queryHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const query: HistoryQuery = {
      taskId: req.query.taskId as string,
      taskIds: req.query.taskIds ? (req.query.taskIds as string).split(',') : undefined,
      success: req.query.success !== undefined ? req.query.success === 'true' : undefined,
      startTime: req.query.startTime as string,
      endTime: req.query.endTime as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };

    const result = await historyService.queryHistory(query);
    res.json(result);
  } catch (error) {
    logger.error('查询执行历史失败', error);
    res.status(500).json({ error: '查询执行历史失败' });
  }
};

/**
 * 获取任务执行摘要
 */
export const getTaskSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;

    const summary = await historyService.getTaskSummary(taskId, days);
    res.json(summary);
  } catch (error: any) {
    logger.error('获取任务摘要失败', error);
    if (error.message === '任务不存在') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: '获取任务摘要失败' });
    }
  }
};

/**
 * 获取多个任务的摘要
 */
export const getTasksSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const taskIds = req.query.taskIds ? (req.query.taskIds as string).split(',') : undefined;
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;

    const summaries = await historyService.getTasksSummary(taskIds, days);
    res.json(summaries);
  } catch (error) {
    logger.error('获取任务摘要列表失败', error);
    res.status(500).json({ error: '获取任务摘要列表失败' });
  }
};

/**
 * 获取任务详细统计
 */
export const getTaskStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const startTime = req.query.startTime
      ? new Date(req.query.startTime as string)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endTime = req.query.endTime ? new Date(req.query.endTime as string) : new Date();

    const statistics = await historyService.getTaskStatistics(taskId, startTime, endTime);
    res.json(statistics);
  } catch (error: any) {
    logger.error('获取任务统计失败', error);
    if (error.message === '任务不存在') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: '获取任务统计失败' });
    }
  }
};

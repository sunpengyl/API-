import { Request, Response } from 'express';
import { AlertService } from './alert.service';
import { logger } from '../../shared/logger';

const alertService = new AlertService();

/**
 * 获取活跃告警列表
 */
export const getActiveAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const taskId = req.query.taskId as string;
    const alerts = await alertService.getActiveAlerts(taskId);
    res.json(alerts);
  } catch (error) {
    logger.error('获取活跃告警失败', error);
    res.status(500).json({ error: '获取活跃告警失败' });
  }
};

/**
 * 获取告警历史
 */
export const getAlertHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = {
      taskId: req.query.taskId as string,
      status: req.query.status as string,
      startTime: req.query.startTime ? new Date(req.query.startTime as string) : undefined,
      endTime: req.query.endTime ? new Date(req.query.endTime as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    };

    const result = await alertService.getAlertHistory(filter);
    res.json(result);
  } catch (error) {
    logger.error('获取告警历史失败', error);
    res.status(500).json({ error: '获取告警历史失败' });
  }
};

/**
 * 解决告警
 */
export const resolveAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { alertId } = req.params;
    await alertService.resolveAlert(alertId);
    res.json({ message: '告警已解决' });
  } catch (error) {
    logger.error('解决告警失败', error);
    res.status(500).json({ error: '解决告警失败' });
  }
};

/**
 * 手动触发告警检查
 */
export const triggerAlertCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    await alertService.checkAndTriggerAlerts(taskId);
    res.json({ message: '告警检查已触发' });
  } catch (error) {
    logger.error('触发告警检查失败', error);
    res.status(500).json({ error: '触发告警检查失败' });
  }
};

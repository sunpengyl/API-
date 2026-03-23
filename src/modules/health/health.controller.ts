import { Request, Response } from 'express';
import { HealthService } from './health.service';
import { TaskService } from '../tasks/task.service';
import { logger } from '../../shared/logger';

const healthService = new HealthService();
const taskService = new TaskService();

const ensureTaskAccess = async (req: Request, res: Response): Promise<string | null> => {
  const { taskId } = req.params;
  const userId = (req as any).user?.id as string | undefined;
  const userRole = (req as any).user?.role as string | undefined;

  if (!taskId || !userId || !userRole) {
    res.status(401).json({ error: '未授权访问' });
    return null;
  }

  const hasAccess = await taskService.checkOwnership(taskId, userId, userRole);
  if (!hasAccess) {
    res.status(404).json({ error: '任务不存在或无权访问' });
    return null;
  }

  return taskId;
};

export class HealthController {
  async getTaskHealth(req: Request, res: Response): Promise<void> {
    try {
      const taskId = await ensureTaskAccess(req, res);
      if (!taskId) {
        return;
      }

      const timeRange = parseInt(req.query.timeRange as string, 10) || 24;
      const healthScore = await healthService.calculateHealthScore(taskId, timeRange);

      res.json({
        success: true,
        data: healthScore,
      });
    } catch (error) {
      logger.error('获取任务健康度失败', error);
      res.status(500).json({ error: '获取任务健康度失败' });
    }
  }

  async getHealthHistory(req: Request, res: Response): Promise<void> {
    try {
      const taskId = await ensureTaskAccess(req, res);
      if (!taskId) {
        return;
      }

      const startTime = req.query.startTime ? new Date(req.query.startTime as string) : undefined;
      const endTime = req.query.endTime ? new Date(req.query.endTime as string) : undefined;
      const history = await healthService.getHealthHistory(taskId, startTime, endTime);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('获取健康度历史失败', error);
      res.status(500).json({ error: '获取健康度历史失败' });
    }
  }

  async getResponseTimeStats(req: Request, res: Response): Promise<void> {
    try {
      const taskId = await ensureTaskAccess(req, res);
      if (!taskId) {
        return;
      }

      const timeRange = parseInt(req.query.timeRange as string, 10) || 24;
      const stats = await healthService.getResponseTimeStats(taskId, timeRange);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('获取响应时间统计失败', error);
      res.status(500).json({ error: '获取响应时间统计失败' });
    }
  }

  async getAllTasksHealth(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id as string | undefined;
      const userRole = (req as any).user?.role as string | undefined;
      const timeRange = parseInt(req.query.timeRange as string, 10) || 24;
      const healthScores = await healthService.getAllTasksHealthOverview(userId, userRole, timeRange);

      res.json({
        success: true,
        data: healthScores,
      });
    } catch (error) {
      logger.error('获取全部任务健康度失败', error);
      res.status(500).json({ error: '获取全部任务健康度失败' });
    }
  }
}

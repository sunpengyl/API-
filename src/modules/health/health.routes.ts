import { Router } from 'express';
import { HealthController } from './health.controller';

const router = Router();
const healthController = new HealthController();

// 获取所有任务健康度概览
router.get('/overview', (req, res) => healthController.getAllTasksHealth(req, res));

// 获取任务健康度评分
router.get('/:taskId', (req, res) => healthController.getTaskHealth(req, res));

// 获取任务健康度历史
router.get('/:taskId/history', (req, res) => healthController.getHealthHistory(req, res));

// 获取响应时间统计
router.get('/:taskId/stats', (req, res) => healthController.getResponseTimeStats(req, res));

export default router;

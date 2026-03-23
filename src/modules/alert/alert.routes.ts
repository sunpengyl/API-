import { Router } from 'express';
import {
  getActiveAlerts,
  getAlertHistory,
  resolveAlert,
  triggerAlertCheck,
} from './alert.controller';

const router = Router();

// 获取活跃告警
router.get('/active', getActiveAlerts);

// 获取告警历史
router.get('/history', getAlertHistory);

// 解决告警
router.post('/:alertId/resolve', resolveAlert);

// 手动触发告警检查
router.post('/tasks/:taskId/check', triggerAlertCheck);

export default router;

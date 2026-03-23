import { Router } from 'express';
import { getSchedulerStatus, triggerTask, rescheduleTask } from './scheduler.controller';

const router = Router();

// 获取调度器状态
router.get('/status', getSchedulerStatus);

// 手动触发任务执行
router.post('/tasks/:taskId/trigger', triggerTask);

// 重新调度任务
router.post('/tasks/:taskId/reschedule', rescheduleTask);

export default router;

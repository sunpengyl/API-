import { Router } from 'express';
import { ExecutorController } from './executor.controller';

const router = Router();
const controller = new ExecutorController();

// 执行相关路由
router.post('/tasks/:id/execute', controller.triggerTask);
router.get('/tasks/:taskId/results', controller.getTaskResults);
router.get('/results/:id', controller.getResult);
router.get('/tasks/:taskId/statistics', controller.getTaskStatistics);

export default router;

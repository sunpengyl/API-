import { Router } from 'express';
import { TaskController } from './task.controller';

const router = Router();
const controller = new TaskController();

// 任务管理路由
router.post('/', controller.createTask);
router.get('/', controller.listTasks);
router.get('/:id', controller.getTask);
router.put('/:id', controller.updateTask);
router.delete('/:id', controller.deleteTask);
router.patch('/:id/toggle', controller.toggleTask);
router.post('/batch/toggle', controller.batchToggleTasks);
router.post('/:id/duplicate', controller.duplicateTask);

export default router;

import { Router } from 'express';
import {
  queryHistory,
  getTaskSummary,
  getTasksSummary,
  getTaskStatistics,
} from './history.controller';

const router = Router();

// 查询执行历史
router.get('/results', queryHistory);

// 获取任务摘要列表
router.get('/summary', getTasksSummary);

// 获取单个任务摘要
router.get('/tasks/:taskId/summary', getTaskSummary);

// 获取任务详细统计
router.get('/tasks/:taskId/statistics', getTaskStatistics);

export default router;

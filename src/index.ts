// 必须在所有其他导入之前加载环境变量
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { logger } from './shared/logger';
import { testConnection } from './shared/database';
import { authenticateJWT } from './shared/middleware/auth.middleware';
import authRoutes from './modules/auth/auth.routes';
import taskRoutes from './modules/tasks/task.routes';
import executorRoutes from './modules/executor/executor.routes';
import schedulerRoutes from './modules/scheduler/scheduler.routes';
import historyRoutes from './modules/history/history.routes';
import alertRoutes from './modules/alert/alert.routes';
import healthRoutes from './modules/health/health.routes';
import { SchedulerService } from './modules/scheduler/scheduler.service';
import { setScheduler } from './modules/scheduler/scheduler.instance';
import { setSchedulerInstance } from './modules/scheduler/scheduler.controller';
import { config } from './shared/config';

// 调试：打印数据库配置
console.log('数据库配置:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? '***已设置***' : '未设置',
  database: process.env.DB_NAME,
});

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 根路径 - 欢迎页面
app.get('/', (_req, res) => {
  res.json({
    name: 'API巡检与告警平台',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      tasks: '/api/tasks',
      executor: '/api/executor',
      docs: '/api-docs (待开发)',
    },
  });
});

// 健康检查
app.get('/health', async (_req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected',
  });
});

// API路由
// 认证路由（无需认证）
app.use('/api/auth', authRoutes);

// 业务路由（需要JWT认证）
app.use('/api/tasks', authenticateJWT, taskRoutes);
app.use('/api/executor', authenticateJWT, executorRoutes);
app.use('/api/scheduler', authenticateJWT, schedulerRoutes);
app.use('/api/history', authenticateJWT, historyRoutes);
app.use('/api/alerts', authenticateJWT, alertRoutes);
app.use('/api/health', authenticateJWT, healthRoutes);

// 404处理
app.use((_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('服务器错误', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务
app.listen(PORT, async () => {
  logger.info(`API巡检与告警平台启动成功，端口: ${PORT}`);
  logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
  
  // 启动调度器
  try {
    const scheduler = new SchedulerService(config.system.maxConcurrentTasks);
    setScheduler(scheduler); // 设置单例
    setSchedulerInstance(scheduler); // 设置控制器实例
    await scheduler.start();
  } catch (error) {
    logger.error('调度器启动失败', error);
  }
});

export default app;

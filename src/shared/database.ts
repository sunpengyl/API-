import mysql from 'mysql2/promise';
import { logger } from './logger';

let pool: mysql.Pool | null = null;

export const getDatabase = (): mysql.Pool => {
  if (!pool) {
    // 直接从环境变量读取，避免config模块缓存问题
    const password = process.env.DB_PASSWORD || '';
    
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: password,
      database: process.env.DB_NAME || 'api_inspection',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    };

    // 调试：打印实际连接配置
    logger.info('创建MySQL连接池，配置:', {
      ...dbConfig,
      password: password ? `***${password.length}位***` : '空字符串或undefined',
      passwordValue: password ? '已设置' : '未设置',
    });

    pool = mysql.createPool(dbConfig);

    logger.info('MySQL连接池已创建');
  }

  return pool;
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL连接池已关闭');
  }
};

export const testConnection = async (): Promise<boolean> => {
  try {
    const db = getDatabase();
    await db.query('SELECT 1');
    logger.info('MySQL连接测试成功');
    return true;
  } catch (error) {
    logger.error('MySQL连接测试失败', error);
    return false;
  }
};

// 延迟导出 db 实例，确保在使用时才创建连接池
export const db: mysql.Pool = new Proxy({} as mysql.Pool, {
  get(_target, prop) {
    return (getDatabase() as any)[prop];
  },
});

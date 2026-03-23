export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'api_inspection',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change_this_secret_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  system: {
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '30', 10),
    defaultResponseTimeThreshold: parseInt(
      process.env.DEFAULT_RESPONSE_TIME_THRESHOLD || '5000',
      10
    ),
    maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '10', 10),
  },
};

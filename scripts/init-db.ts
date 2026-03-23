import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function initDatabase() {
  console.log('开始初始化数据库...');

  // 读取SQL文件
  const sqlPath = path.join(__dirname, '../database/migrations/001_create_tables.sql');
  let sql = fs.readFileSync(sqlPath, 'utf-8');

  // 生成管理员密码hash
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2026!ChangeMe';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // 替换占位符
  sql = sql.replace('$2a$10$placeholder_hash_will_be_replaced', passwordHash);

  // 连接MySQL（不指定数据库）
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    console.log('执行SQL脚本...');
    await connection.query(sql);
    console.log('✅ 数据库初始化成功！');
    console.log('');
    console.log('默认管理员账号:');
    console.log('  用户名: admin');
    console.log(`  密码: ${adminPassword}`);
    console.log('');
    console.log('⚠️  请在首次登录后立即修改默认密码！');
    console.log('💡  你也可以通过环境变量 ADMIN_DEFAULT_PASSWORD 自定义初始化密码。');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 执行初始化
initDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

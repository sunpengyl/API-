import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../../shared/config';
import { db } from '../../shared/database';
import { logger } from '../../shared/logger';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserInfo {
  id: string;
  username: string;
  role: string;
  email?: string;
}

export interface AuthResponse {
  token: string;
  user: UserInfo;
}

export class AuthService {
  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { username, password } = credentials;

    // 查询用户
    const [rows] = await db.execute(
      'SELECT id, username, password, role, email FROM users WHERE username = ?',
      [username]
    );

    const users = rows as any[];
    if (users.length === 0) {
      throw new Error('用户名或密码错误');
    }

    const user = users[0];

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('用户名或密码错误');
    }

    // 生成 JWT token
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    const secret = config.jwt.secret as string;
    const token = jwt.sign(payload, secret, {
      expiresIn: '7d',
    });

    logger.info(`用户登录成功: ${username}`);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
      },
    };
  }

  /**
   * 验证 token
   */
  verifyToken(token: string): UserInfo {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      return {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
      };
    } catch (error) {
      throw new Error('无效的token');
    }
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userId: string): Promise<UserInfo | null> {
    const [rows] = await db.execute(
      'SELECT id, username, role, email FROM users WHERE id = ?',
      [userId]
    );

    const users = rows as any[];
    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
    };
  }

  /**
   * 修改密码
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    // 查询用户
    const [rows] = await db.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    const users = rows as any[];
    if (users.length === 0) {
      throw new Error('用户不存在');
    }

    const user = users[0];

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('旧密码错误');
    }

    // 加密新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await db.execute('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [
      newPasswordHash,
      userId,
    ]);

    logger.info(`用户修改密码成功: ${userId}`);
  }
}

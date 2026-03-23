import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

// 临时的认证中间件（完整版在任务9实现）
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  // 临时：从请求头获取用户信息（开发阶段）
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;

  if (!userId) {
    res.status(401).json({ error: '未授权：缺少用户信息' });
    return;
  }

  (req as any).user = {
    id: userId,
    username: 'temp_user',
    role: userRole || 'developer',
  };

  next();
};

// JWT认证中间件（任务9会完善）
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: '未授权：缺少token' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    (req as any).user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
    next();
  } catch (error) {
    res.status(403).json({ error: '无效的token' });
  }
};

// 角色检查中间件
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ error: '未授权' });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({ error: '权限不足' });
      return;
    }

    next();
  };
};

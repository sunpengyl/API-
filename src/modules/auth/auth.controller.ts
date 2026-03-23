import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { logger } from '../../shared/logger';

const authService = new AuthService();

export class AuthController {
  /**
   * 用户登录
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: '用户名和密码不能为空' });
        return;
      }

      const result = await authService.login({ username, password });

      res.json({
        success: true,
        data: result,
        token: result.token,
        user: result.user,
      });
    } catch (error: any) {
      logger.error('登录失败:', error);
      res.status(401).json({ error: error.message || '登录失败' });
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({ error: '未授权' });
        return;
      }

      const userInfo = await authService.getUserInfo(user.id);

      if (!userInfo) {
        res.status(404).json({ error: '用户不存在' });
        return;
      }

      res.json({
        success: true,
        data: userInfo,
      });
    } catch (error: any) {
      logger.error('获取用户信息失败:', error);
      res.status(500).json({ error: '获取用户信息失败' });
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        res.status(400).json({ error: '旧密码和新密码不能为空' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: '新密码长度不能少于6位' });
        return;
      }

      await authService.changePassword(user.id, oldPassword, newPassword);

      res.json({
        success: true,
        message: '密码修改成功',
      });
    } catch (error: any) {
      logger.error('修改密码失败:', error);
      res.status(400).json({ error: error.message || '修改密码失败' });
    }
  }

  /**
   * 登出（客户端删除 token 即可）
   */
  async logout(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      message: '登出成功',
    });
  }
}

import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateJWT } from '../../shared/middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// 登录（无需认证）
router.post('/login', (req, res) => authController.login(req, res));

// 获取当前用户信息（需要认证）
router.get('/me', authenticateJWT, (req, res) => authController.getCurrentUser(req, res));

// 修改密码（需要认证）
router.post('/change-password', authenticateJWT, (req, res) =>
  authController.changePassword(req, res)
);

// 登出（需要认证）
router.post('/logout', authenticateJWT, (req, res) => authController.logout(req, res));

export default router;

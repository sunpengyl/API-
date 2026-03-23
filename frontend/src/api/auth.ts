import request from './request';

export const authApi = {
  // 登录
  login(username: string, password: string) {
    return request.post('/auth/login', { username, password });
  },

  // 获取当前用户信息
  getCurrentUser() {
    return request.get('/auth/me');
  },

  // 修改密码
  changePassword(oldPassword: string, newPassword: string) {
    return request.post('/auth/change-password', { oldPassword, newPassword });
  },

  // 登出
  logout() {
    return request.post('/auth/logout');
  },
};

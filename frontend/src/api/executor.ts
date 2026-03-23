import request from './request';

export const executorApi = {
  // 手动触发任务执行
  triggerTask(taskId: string) {
    return request.post(`/executor/tasks/${taskId}/execute`);
  },

  // 获取任务执行历史
  getTaskResults(taskId: string, params?: any) {
    return request.get(`/executor/tasks/${taskId}/results`, { params });
  },

  // 获取执行结果详情
  getResult(id: string) {
    return request.get(`/executor/results/${id}`);
  },

  // 获取任务统计
  getTaskStatistics(taskId: string, params?: any) {
    return request.get(`/executor/tasks/${taskId}/statistics`, { params });
  },
};

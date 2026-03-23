import request from './request';

export const healthApi = {
  getAllTasksHealth(timeRange: number = 24) {
    return request.get('/health/overview', { params: { timeRange } }).then((response: any) => response?.data ?? response);
  },

  getTaskHealth(taskId: string, timeRange: number = 24) {
    return request.get(`/health/${taskId}`, { params: { timeRange } }).then((response: any) => response?.data ?? response);
  },

  getHealthHistory(taskId: string, startTime?: string, endTime?: string) {
    return request
      .get(`/health/${taskId}/history`, {
        params: { startTime, endTime },
      })
      .then((response: any) => response?.data ?? response);
  },

  getResponseTimeStats(taskId: string, timeRange: number = 24) {
    return request.get(`/health/${taskId}/stats`, { params: { timeRange } }).then((response: any) => response?.data ?? response);
  },
};

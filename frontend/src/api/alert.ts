import request from './request';

export interface AlertHistoryQuery {
  taskId?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}

export const alertApi = {
  // 获取活跃告警
  getActiveAlerts(taskId?: string) {
    return request.get('/alerts/active', {
      params: { taskId },
    });
  },

  // 获取告警历史
  getAlertHistory(params: AlertHistoryQuery) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    return request.get('/alerts/history', {
      params: {
        taskId: params.taskId,
        status: params.status,
        startTime: params.startTime,
        endTime: params.endTime,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      },
    });
  },

  // 解决告警
  resolveAlert(alertId: string) {
    return request.post(`/alerts/${alertId}/resolve`);
  },

  // 手动触发告警检查
  triggerAlertCheck(taskId: string) {
    return request.post(`/alerts/tasks/${taskId}/check`);
  },
};

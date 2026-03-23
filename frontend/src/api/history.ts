import request from './request';

export interface HistoryQuery {
  taskId?: string;
  taskIds?: string[];
  success?: boolean;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}

export const historyApi = {
  // 查询执行历史
  queryHistory(params: HistoryQuery) {
    return request.get('/history/results', { params });
  },

  // 获取任务摘要
  getTaskSummary(taskId: string, days?: number) {
    return request.get(`/history/tasks/${taskId}/summary`, {
      params: { days },
    });
  },

  // 获取任务摘要列表
  getTasksSummary(taskIds?: string[], days?: number) {
    return request.get('/history/summary', {
      params: {
        taskIds: taskIds?.join(','),
        days,
      },
    });
  },

  // 获取任务统计
  getTaskStatistics(taskId: string, startTime?: string, endTime?: string) {
    return request.get(`/history/tasks/${taskId}/statistics`, {
      params: { startTime, endTime },
    });
  },
};

import request from './request';

export interface Task {
  id?: string;
  name: string;
  description?: string;
  enabled: boolean;
  frequency: {
    type: 'minute' | 'hour' | 'day';
    interval: number;
    cron?: string;
  };
  apiEndpoint: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    body?: any;
    timeout: number;
  };
  validationRules: any[];
  alertRules: any[];
  environments?: any[];
  fluctuationMonitors?: any[];
  tags: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  lastExecutedAt?: string;
}

export const taskApi = {
  // 获取任务列表
  getTasks(params?: any) {
    return request.get('/tasks', { params });
  },

  // 获取任务详情
  getTask(id: string) {
    return request.get(`/tasks/${id}`);
  },

  // 创建任务
  createTask(data: Task) {
    return request.post('/tasks', data);
  },

  // 更新任务
  updateTask(id: string, data: Partial<Task>) {
    return request.put(`/tasks/${id}`, data);
  },

  // 删除任务
  deleteTask(id: string) {
    return request.delete(`/tasks/${id}`);
  },

  // 启用/禁用任务
  toggleTask(id: string, enabled: boolean) {
    return request.patch(`/tasks/${id}/toggle`, { enabled });
  },

  // 批量启用/禁用
  batchToggle(ids: string[], enabled: boolean) {
    return request.post('/tasks/batch/toggle', { ids, enabled });
  },

  // 复制任务
  duplicateTask(id: string) {
    return request.post(`/tasks/${id}/duplicate`);
  },
};

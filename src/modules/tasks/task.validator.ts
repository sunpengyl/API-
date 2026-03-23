import { InspectionTask, ScheduleFrequency, ApiEndpoint } from '../../types/models';

export class TaskValidator {
  validateTask(task: Omit<InspectionTask, 'id' | 'createdAt' | 'updatedAt'>): void {
    // 验证任务名称
    if (!task.name || task.name.trim().length === 0) {
      throw new Error('任务名称不能为空');
    }

    if (task.name.length > 100) {
      throw new Error('任务名称不能超过100个字符');
    }

    // 验证执行频率
    this.validateFrequency(task.frequency);

    // 验证API端点
    this.validateApiEndpoint(task.apiEndpoint);

    // 验证校验规则
    if (task.validationRules) {
      task.validationRules.forEach((rule, index) => {
        if (!rule.fieldPath || rule.fieldPath.trim().length === 0) {
          throw new Error(`校验规则${index + 1}的字段路径不能为空`);
        }
      });
    }

    // 验证告警规则
    if (task.alertRules) {
      task.alertRules.forEach((rule, index) => {
        if (!rule.name || rule.name.trim().length === 0) {
          throw new Error(`告警规则${index + 1}的名称不能为空`);
        }
      });
    }
  }

  validateFrequency(frequency: ScheduleFrequency): void {
    if (!frequency.type) {
      throw new Error('执行频率类型不能为空');
    }

    if (!['minute', 'hour', 'day'].includes(frequency.type)) {
      throw new Error('执行频率类型必须是 minute、hour 或 day');
    }

    if (!frequency.interval || frequency.interval <= 0) {
      throw new Error('执行频率间隔必须大于0');
    }

    // 验证间隔范围
    if (frequency.type === 'minute' && (frequency.interval < 1 || frequency.interval > 59)) {
      throw new Error('分钟间隔必须在1-59之间');
    }

    if (frequency.type === 'hour' && (frequency.interval < 1 || frequency.interval > 23)) {
      throw new Error('小时间隔必须在1-23之间');
    }

    if (frequency.type === 'day' && (frequency.interval < 1 || frequency.interval > 365)) {
      throw new Error('天数间隔必须在1-365之间');
    }
  }

  validateApiEndpoint(endpoint: ApiEndpoint): void {
    // 验证URL
    if (!endpoint.url || endpoint.url.trim().length === 0) {
      throw new Error('API地址不能为空');
    }

    try {
      new URL(endpoint.url);
    } catch {
      throw new Error('API地址格式不正确');
    }

    // 验证HTTP方法
    if (!endpoint.method) {
      throw new Error('HTTP方法不能为空');
    }

    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(endpoint.method)) {
      throw new Error('HTTP方法必须是 GET、POST、PUT 或 DELETE');
    }

    // 验证超时时间
    if (!endpoint.timeout || endpoint.timeout <= 0) {
      throw new Error('超时时间必须大于0');
    }

    if (endpoint.timeout > 60000) {
      throw new Error('超时时间不能超过60秒');
    }
  }
}

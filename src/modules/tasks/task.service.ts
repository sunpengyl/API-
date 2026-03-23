import { TaskRepository, TaskFilter } from './task.repository';
import { InspectionTask } from '../../types/models';
import { TaskValidator } from './task.validator';
import { getScheduler } from '../scheduler/scheduler.instance';
import { logger } from '../../shared/logger';

export class TaskService {
  private repository: TaskRepository;
  private validator: TaskValidator;

  constructor() {
    this.repository = new TaskRepository();
    this.validator = new TaskValidator();
  }

  async createTask(
    task: Omit<InspectionTask, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<string> {
    // 验证任务配置
    this.validator.validateTask(task);

    // 设置创建人
    const taskWithCreator = { ...task, createdBy: userId };

    const taskId = await this.repository.create(taskWithCreator);
    
    // 如果任务已启用，添加到调度器
    const scheduler = getScheduler();
    if (scheduler && task.enabled) {
      try {
        const createdTask = await this.repository.findById(taskId);
        if (createdTask) {
          await scheduler.scheduleTask(createdTask);
          logger.info(`任务 ${taskId} 已添加到调度器`);
        }
      } catch (error) {
        logger.error(`任务 ${taskId} 添加到调度器失败`, error);
      }
    }

    return taskId;
  }

  async getTask(id: string, userId?: string, userRole?: string): Promise<InspectionTask | null> {
    const task = await this.repository.findById(id);
    
    // 权限检查：开发者只能查看自己创建的任务
    if (task && userId && userRole === 'developer' && task.createdBy !== userId) {
      return null;
    }
    
    return task;
  }

  async listTasks(filter: TaskFilter = {}, userId?: string, userRole?: string): Promise<InspectionTask[]> {
    // 权限过滤：开发者只能查看自己创建的任务
    if (userRole === 'developer' && userId) {
      filter.createdBy = userId;
    }
    
    return await this.repository.findAll(filter);
  }

  async updateTask(id: string, updates: Partial<InspectionTask>, userId?: string, userRole?: string): Promise<void> {
    // 检查任务是否存在
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('任务不存在');
    }

    // 权限检查：开发者只能更新自己创建的任务
    if (userRole === 'developer' && existing.createdBy !== userId) {
      throw new Error('权限不足：只能修改自己创建的任务');
    }

    // 验证更新内容
    if (updates.frequency) {
      this.validator.validateFrequency(updates.frequency);
    }
    if (updates.apiEndpoint) {
      this.validator.validateApiEndpoint(updates.apiEndpoint);
    }

    await this.repository.update(id, updates);
    
    // 重新调度任务
    const scheduler = getScheduler();
    if (scheduler) {
      try {
        await scheduler.rescheduleTask(id);
        logger.info(`任务 ${id} 已重新调度`);
      } catch (error) {
        logger.error(`任务 ${id} 重新调度失败`, error);
      }
    }
  }

  async deleteTask(id: string, userId?: string, userRole?: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('任务不存在');
    }

    // 权限检查：开发者只能删除自己创建的任务
    if (userRole === 'developer' && existing.createdBy !== userId) {
      throw new Error('权限不足：只能删除自己创建的任务');
    }

    // 从调度器中移除
    const scheduler = getScheduler();
    if (scheduler) {
      try {
        scheduler.unscheduleTask(id);
        logger.info(`任务 ${id} 已从调度器移除`);
      } catch (error) {
        logger.error(`任务 ${id} 从调度器移除失败`, error);
      }
    }

    await this.repository.delete(id);
  }

  async toggleTask(id: string, enabled: boolean, userId?: string, userRole?: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('任务不存在');
    }

    // 权限检查：开发者只能修改自己创建的任务
    if (userRole === 'developer' && existing.createdBy !== userId) {
      throw new Error('权限不足：只能修改自己创建的任务');
    }

    await this.repository.toggleEnabled(id, enabled);
    
    // 更新调度状态
    const scheduler = getScheduler();
    if (scheduler) {
      try {
        await scheduler.rescheduleTask(id);
        logger.info(`任务 ${id} 调度状态已更新: ${enabled ? '启用' : '禁用'}`);
      } catch (error) {
        logger.error(`任务 ${id} 调度状态更新失败`, error);
      }
    }
  }

  async batchToggleTasks(ids: string[], enabled: boolean): Promise<void> {
    if (ids.length === 0) {
      throw new Error('任务ID列表不能为空');
    }

    await this.repository.batchToggleEnabled(ids, enabled);
  }

  async duplicateTask(id: string, userId: string): Promise<string> {
    return await this.repository.duplicate(id, userId);
  }

  async checkOwnership(taskId: string, userId: string, userRole: string): Promise<boolean> {
    // 管理员可以访问所有任务
    if (userRole === 'admin') {
      return true;
    }

    const task = await this.repository.findById(taskId);
    if (!task) {
      return false;
    }

    // 开发者只能访问自己创建的任务
    return task.createdBy === userId;
  }
}

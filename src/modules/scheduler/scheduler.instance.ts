import { SchedulerService } from './scheduler.service';

// 调度器单例
let schedulerInstance: SchedulerService | null = null;

export const setScheduler = (scheduler: SchedulerService): void => {
  schedulerInstance = scheduler;
};

export const getScheduler = (): SchedulerService | null => {
  return schedulerInstance;
};

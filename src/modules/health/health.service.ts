import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../shared/database';
import { logger } from '../../shared/logger';
import { HealthLevel, HealthScore as StoredHealthScore } from '../../types/models';
import { TaskRepository } from '../tasks/task.repository';

interface InspectionResultMetricsRow extends RowDataPacket {
  success: number | boolean;
  response_time: number;
  validation_results: unknown;
  executed_at: Date;
}

interface HealthScoreRow extends RowDataPacket {
  id: string;
  task_id: string;
  score: number;
  level: HealthLevel;
  success_rate: number;
  avg_response_time: number;
  validation_pass_rate: number;
  calculated_at: Date;
  time_range_start: Date;
  time_range_end: Date;
}

export interface HealthOverviewItem {
  taskId: string;
  taskName: string;
  score: number;
  level: HealthLevel;
  successRate: number;
  avgResponseTime: number;
  validationPassRate: number;
  calculatedAt: Date;
}

export interface HealthHistoryItem {
  id: string;
  taskId: string;
  score: number;
  level: HealthLevel;
  successRate: number;
  avgResponseTime: number;
  validationPassRate: number;
  calculatedAt: Date;
  timeRangeStart: Date;
  timeRangeEnd: Date;
}

export interface ResponseTimeStats {
  taskId: string;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  count: number;
}

interface ComputeOptions {
  persist?: boolean;
}

export class HealthService {
  private readonly taskRepository: TaskRepository;

  constructor() {
    this.taskRepository = new TaskRepository();
  }

  async calculateHealthScore(
    taskId: string,
    timeRangeHours: number = 24,
    options: ComputeOptions = {}
  ): Promise<StoredHealthScore> {
    const normalizedRange = this.normalizeTimeRange(timeRangeHours);
    const timeRangeEnd = this.roundToMinute(new Date());
    const timeRange = {
      start: new Date(timeRangeEnd.getTime() - normalizedRange * 60 * 60 * 1000),
      end: timeRangeEnd,
    };
    const rows = await this.getResultMetrics(taskId, timeRange.start, timeRange.end);
    const healthScore = this.buildHealthScore(taskId, rows, timeRange);

    if (options.persist !== false) {
      await this.saveHealthScore(healthScore);
    }

    return healthScore;
  }

  async getHealthHistory(
    taskId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<HealthHistoryItem[]> {
    let sql = `
      SELECT
        id,
        task_id,
        score,
        level,
        success_rate,
        avg_response_time,
        validation_pass_rate,
        calculated_at,
        time_range_start,
        time_range_end
      FROM health_scores
      WHERE task_id = ?
    `;
    const params: Array<string | Date> = [taskId];

    if (startTime) {
      sql += ' AND calculated_at >= ?';
      params.push(startTime);
    }

    if (endTime) {
      sql += ' AND calculated_at <= ?';
      params.push(endTime);
    }

    sql += ' ORDER BY calculated_at DESC LIMIT 100';

    const [rows] = await db.execute<HealthScoreRow[]>(sql, params);
    return rows.map((row) => this.mapHealthHistoryRow(row));
  }

  async getResponseTimeStats(taskId: string, timeRangeHours: number = 24): Promise<ResponseTimeStats> {
    const normalizedRange = this.normalizeTimeRange(timeRangeHours);
    const startTime = new Date(Date.now() - normalizedRange * 60 * 60 * 1000);
    const endTime = new Date();
    const [rows] = await db.execute<InspectionResultMetricsRow[]>(
      `
        SELECT response_time
        FROM inspection_results
        WHERE task_id = ? AND executed_at >= ? AND executed_at <= ? AND success = true
        ORDER BY response_time ASC
      `,
      [taskId, startTime, endTime]
    );

    const responseTimes = rows
      .map((row) => Number(row.response_time))
      .filter((value) => Number.isFinite(value) && value >= 0);

    if (responseTimes.length === 0) {
      return {
        taskId,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        count: 0,
      };
    }

    const total = responseTimes.reduce((sum, value) => sum + value, 0);

    return {
      taskId,
      avg: Math.round(total / responseTimes.length),
      p50: Math.round(this.percentile(responseTimes, 50)),
      p95: Math.round(this.percentile(responseTimes, 95)),
      p99: Math.round(this.percentile(responseTimes, 99)),
      min: Math.round(responseTimes[0]),
      max: Math.round(responseTimes[responseTimes.length - 1]),
      count: responseTimes.length,
    };
  }

  async getAllTasksHealthOverview(
    userId?: string,
    userRole?: string,
    timeRangeHours: number = 24
  ): Promise<HealthOverviewItem[]> {
    const filter = userRole === 'developer' && userId ? { createdBy: userId } : {};
    const tasks = await this.taskRepository.findAll(filter);
    const enabledTasks = tasks.filter((task) => task.enabled);
    const scores = await Promise.all(
      enabledTasks.map((task) => this.calculateHealthScore(task.id, timeRangeHours, { persist: false }))
    );

    return scores.map((score, index) => ({
      taskId: score.taskId,
      taskName: enabledTasks[index].name,
      score: score.score,
      level: score.level,
      successRate: score.successRate,
      avgResponseTime: score.avgResponseTime,
      validationPassRate: score.validationPassRate,
      calculatedAt: score.calculatedAt,
    }));
  }

  private async getResultMetrics(
    taskId: string,
    startTime: Date,
    endTime: Date
  ): Promise<InspectionResultMetricsRow[]> {
    const [rows] = await db.execute<InspectionResultMetricsRow[]>(
      `
        SELECT success, response_time, validation_results, executed_at
        FROM inspection_results
        WHERE task_id = ? AND executed_at >= ? AND executed_at <= ?
        ORDER BY executed_at ASC
      `,
      [taskId, startTime, endTime]
    );

    return rows;
  }

  private buildHealthScore(
    taskId: string,
    rows: InspectionResultMetricsRow[],
    timeRange: { start: Date; end: Date }
  ): StoredHealthScore {
    if (rows.length === 0) {
      return {
        id: uuidv4(),
        taskId,
        score: 0,
        level: 'critical',
        successRate: 0,
        avgResponseTime: 0,
        validationPassRate: 0,
        calculatedAt: new Date(),
        timeRange,
      };
    }

    const totalCount = rows.length;
    const successCount = rows.filter((row) => Boolean(row.success)).length;
    const successRate = (successCount / totalCount) * 100;

    const responseTimes = rows
      .map((row) => Number(row.response_time))
      .filter((value) => Number.isFinite(value) && value >= 0);
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length
        : 0;

    const validationStats = rows.reduce(
      (acc, row) => {
        const validationResults = this.parseValidationResults(row.validation_results);
        acc.total += validationResults.length;
        acc.passed += validationResults.filter((item) => item?.passed).length;
        return acc;
      },
      { total: 0, passed: 0 }
    );

    const validationPassRate =
      validationStats.total > 0 ? (validationStats.passed / validationStats.total) * 100 : 100;

    const responseTimeScore = Math.max(0, 100 - (avgResponseTime / 5000) * 100);
    const score = Math.round(successRate * 0.6 + validationPassRate * 0.2 + responseTimeScore * 0.2);
    const level = this.mapLevel(score);

    return {
      id: uuidv4(),
      taskId,
      score,
      level,
      successRate: Number(successRate.toFixed(2)),
      avgResponseTime: Math.round(avgResponseTime),
      validationPassRate: Number(validationPassRate.toFixed(2)),
      calculatedAt: new Date(),
      timeRange,
    };
  }

  private async saveHealthScore(healthScore: StoredHealthScore): Promise<void> {
    try {
      const [existingRows] = await db.execute<RowDataPacket[]>(
        `
          SELECT id
          FROM health_scores
          WHERE task_id = ? AND time_range_start = ? AND time_range_end = ?
          LIMIT 1
        `,
        [healthScore.taskId, healthScore.timeRange.start, healthScore.timeRange.end]
      );

      if (existingRows.length > 0) {
        return;
      }

      await db.execute(
        `
          INSERT INTO health_scores (
            id,
            task_id,
            score,
            level,
            success_rate,
            avg_response_time,
            validation_pass_rate,
            calculated_at,
            time_range_start,
            time_range_end
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          healthScore.id,
          healthScore.taskId,
          healthScore.score,
          healthScore.level,
          healthScore.successRate,
          healthScore.avgResponseTime,
          healthScore.validationPassRate,
          healthScore.calculatedAt,
          healthScore.timeRange.start,
          healthScore.timeRange.end,
        ]
      );
    } catch (error) {
      logger.error('保存健康度评分失败', error);
      throw error;
    }
  }

  private mapHealthHistoryRow(row: HealthScoreRow): HealthHistoryItem {
    return {
      id: row.id,
      taskId: row.task_id,
      score: Number(row.score),
      level: row.level,
      successRate: Number(row.success_rate),
      avgResponseTime: Number(row.avg_response_time),
      validationPassRate: Number(row.validation_pass_rate),
      calculatedAt: new Date(row.calculated_at),
      timeRangeStart: new Date(row.time_range_start),
      timeRangeEnd: new Date(row.time_range_end),
    };
  }

  private parseValidationResults(value: unknown): Array<{ passed?: boolean }> {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value as Array<{ passed?: boolean }>;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  private mapLevel(score: number): HealthLevel {
    if (score >= 90) {
      return 'excellent';
    }
    if (score >= 70) {
      return 'good';
    }
    if (score >= 50) {
      return 'warning';
    }
    return 'critical';
  }

  private percentile(sortedArray: number[], percentileValue: number): number {
    const index = (percentileValue / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sortedArray[lower];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  private normalizeTimeRange(timeRangeHours: number): number {
    if (!Number.isFinite(timeRangeHours) || timeRangeHours <= 0) {
      return 24;
    }

    return Math.floor(timeRangeHours);
  }

  private roundToMinute(date: Date): Date {
    const rounded = new Date(date);
    rounded.setSeconds(0, 0);
    return rounded;
  }
}

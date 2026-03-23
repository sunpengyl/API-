import { RowDataPacket } from 'mysql2';
import { getDatabase } from '../../shared/database';
import { InspectionResult } from '../../types/models';

export interface ResultFilter {
  taskId?: string;
  taskIds?: string[]; // 支持多任务查询
  success?: boolean;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export class ResultRepository {
  async create(result: InspectionResult): Promise<void> {
    const db = getDatabase();

    const sql = `
      INSERT INTO inspection_results (
        id, task_id, executed_at, success, status_code, response_time,
        response_body, validation_results, error_code, error_message, error_stack, environment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(sql, [
      result.id,
      result.taskId,
      result.executedAt,
      result.success,
      result.statusCode || null,
      result.responseTime,
      JSON.stringify(result.response || null),
      JSON.stringify(result.validationResults),
      result.error?.code || null,
      result.error?.message || null,
      result.error?.stack || null,
      result.environment || null,
    ]);
  }

  async findById(id: string): Promise<InspectionResult | null> {
    const db = getDatabase();
    const sql = 'SELECT * FROM inspection_results WHERE id = ?';
    const [rows] = await db.execute<RowDataPacket[]>(sql, [id]);

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToResult(rows[0]);
  }

  async findByTaskId(
    taskId: string,
    filter: ResultFilter = {}
  ): Promise<{ results: InspectionResult[]; total: number }> {
    return this.findAll({ ...filter, taskId });
  }

  async findAll(
    filter: ResultFilter = {}
  ): Promise<{ results: InspectionResult[]; total: number }> {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.taskId) {
      conditions.push('task_id = ?');
      params.push(filter.taskId);
    }

    if (filter.taskIds && filter.taskIds.length > 0) {
      const placeholders = filter.taskIds.map(() => '?').join(',');
      conditions.push(`task_id IN (${placeholders})`);
      params.push(...filter.taskIds);
    }

    if (filter.success !== undefined) {
      conditions.push('success = ?');
      params.push(filter.success);
    }

    if (filter.startTime) {
      conditions.push('executed_at >= ?');
      params.push(filter.startTime);
    }

    if (filter.endTime) {
      conditions.push('executed_at <= ?');
      params.push(filter.endTime);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM inspection_results ${whereClause}`;
    let countRows;
    if (params.length > 0) {
      [countRows] = await db.execute<RowDataPacket[]>(countSql, params);
    } else {
      [countRows] = await db.query<RowDataPacket[]>(countSql);
    }
    const total = countRows[0].total;

    // 查询数据
    const limit = this.normalizePaginationValue(filter.limit, 50);
    const offset = this.normalizePaginationValue(filter.offset, 0);
    const dataSql = `
      SELECT * FROM inspection_results 
      ${whereClause}
      ORDER BY executed_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    let dataRows;
    if (params.length > 0) {
      [dataRows] = await db.execute<RowDataPacket[]>(dataSql, params);
    } else {
      [dataRows] = await db.query<RowDataPacket[]>(dataSql);
    }
    const results = dataRows.map((row) => this.mapRowToResult(row));

    return { results, total };
  }

  async getLatestResult(taskId: string): Promise<InspectionResult | null> {
    const db = getDatabase();
    const sql = `
      SELECT * FROM inspection_results 
      WHERE task_id = ? 
      ORDER BY executed_at DESC 
      LIMIT 1
    `;
    const [rows] = await db.execute<RowDataPacket[]>(sql, [taskId]);

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToResult(rows[0]);
  }

  async getConsecutiveFailures(taskId: string): Promise<number> {
    const db = getDatabase();
    const sql = `
      SELECT success FROM inspection_results 
      WHERE task_id = ? 
      ORDER BY executed_at DESC 
      LIMIT 100
    `;
    const [rows] = await db.execute<RowDataPacket[]>(sql, [taskId]);

    let consecutiveFailures = 0;
    for (const row of rows) {
      if (!row.success) {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    return consecutiveFailures;
  }

  async getStatistics(taskId: string, startTime: Date, endTime: Date) {
    const db = getDatabase();
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successCount,
        AVG(response_time) as avgResponseTime,
        MIN(response_time) as minResponseTime,
        MAX(response_time) as maxResponseTime
      FROM inspection_results
      WHERE task_id = ? AND executed_at BETWEEN ? AND ?
    `;

    const [rows] = await db.execute<RowDataPacket[]>(sql, [taskId, startTime, endTime]);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      total: row.total,
      successCount: row.successCount,
      failureCount: row.total - row.successCount,
      successRate: row.total > 0 ? (row.successCount / row.total) * 100 : 0,
      avgResponseTime: Math.round(row.avgResponseTime || 0),
      minResponseTime: row.minResponseTime || 0,
      maxResponseTime: row.maxResponseTime || 0,
    };
  }

  private mapRowToResult(row: RowDataPacket): InspectionResult {
    const result: InspectionResult = {
      id: row.id,
      taskId: row.task_id,
      executedAt: new Date(row.executed_at),
      success: Boolean(row.success),
      statusCode: row.status_code,
      responseTime: row.response_time,
      response: this.parseJsonColumn(row.response_body, null),
      validationResults: this.parseJsonColumn(row.validation_results, []),
      environment: row.environment,
    };

    if (row.error_code) {
      result.error = {
        code: row.error_code,
        message: row.error_message,
        stack: row.error_stack,
      };
    }

    return result;
  }

  private normalizePaginationValue(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      return fallback;
    }

    return Math.floor(value);
  }

  private parseJsonColumn<T>(value: unknown, fallback: T): T {
    if (value === null || value === undefined) {
      return fallback;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        // 某些响应体本身就是纯文本/HTML，不是 JSON 字符串
        return value as T;
      }
    }

    return value as T;
  }
}

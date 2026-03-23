import { RowDataPacket } from 'mysql2';
import { getDatabase } from '../../shared/database';
import { Alert } from '../../types/models';

export interface AlertFilter {
  taskId?: string;
  status?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export class AlertRepository {
  async create(alert: Alert): Promise<void> {
    const db = getDatabase();

    const sql = `
      INSERT INTO alerts (
        id, task_id, rule_id, type, severity, title, message, details,
        triggered_at, resolved_at, status, notification_channels
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(sql, [
      alert.id,
      alert.taskId,
      alert.ruleId,
      alert.type,
      alert.severity,
      alert.title,
      alert.message,
      JSON.stringify(alert.details || {}),
      alert.triggeredAt,
      alert.resolvedAt || null,
      alert.status,
      JSON.stringify(alert.notificationChannels || []),
    ]);
  }

  async findById(id: string): Promise<Alert | null> {
    const db = getDatabase();
    const sql = 'SELECT * FROM alerts WHERE id = ?';
    const [rows] = await db.execute<RowDataPacket[]>(sql, [id]);

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToAlert(rows[0]);
  }

  async findActiveAlert(taskId: string, ruleId: string): Promise<Alert | null> {
    const db = getDatabase();
    const sql = `
      SELECT * FROM alerts 
      WHERE task_id = ? AND rule_id = ? AND status = 'active'
      ORDER BY triggered_at DESC
      LIMIT 1
    `;
    const [rows] = await db.execute<RowDataPacket[]>(sql, [taskId, ruleId]);

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToAlert(rows[0]);
  }

  async findActiveAlerts(taskId?: string): Promise<Alert[]> {
    const db = getDatabase();
    let sql = "SELECT * FROM alerts WHERE status = 'active'";
    const params: any[] = [];

    if (taskId) {
      sql += ' AND task_id = ?';
      params.push(taskId);
    }

    sql += ' ORDER BY triggered_at DESC';

    const [rows] = params.length > 0
      ? await db.execute<RowDataPacket[]>(sql, params)
      : await db.query<RowDataPacket[]>(sql);

    return rows.map(row => this.mapRowToAlert(row));
  }

  async findAll(filter: AlertFilter): Promise<{ alerts: Alert[]; total: number }> {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.taskId) {
      conditions.push('task_id = ?');
      params.push(filter.taskId);
    }

    if (filter.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }

    if (filter.startTime) {
      conditions.push('triggered_at >= ?');
      params.push(filter.startTime);
    }

    if (filter.endTime) {
      conditions.push('triggered_at <= ?');
      params.push(filter.endTime);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM alerts ${whereClause}`;
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
      SELECT * FROM alerts 
      ${whereClause}
      ORDER BY triggered_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    let dataRows;
    if (params.length > 0) {
      [dataRows] = await db.execute<RowDataPacket[]>(dataSql, params);
    } else {
      [dataRows] = await db.query<RowDataPacket[]>(dataSql);
    }
    const alerts = dataRows.map(row => this.mapRowToAlert(row));

    return { alerts, total };
  }

  async resolve(alertId: string): Promise<void> {
    const db = getDatabase();
    const sql = `
      UPDATE alerts 
      SET status = 'resolved', resolved_at = NOW()
      WHERE id = ?
    `;
    await db.execute(sql, [alertId]);
  }

  async suppress(alertId: string): Promise<void> {
    const db = getDatabase();
    const sql = `
      UPDATE alerts 
      SET status = 'suppressed'
      WHERE id = ?
    `;
    await db.execute(sql, [alertId]);
  }

  private mapRowToAlert(row: RowDataPacket): Alert {
    return {
      id: row.id,
      taskId: row.task_id,
      ruleId: row.rule_id,
      type: row.type,
      severity: row.severity,
      title: row.title,
      message: row.message,
      details: JSON.parse(row.details || '{}'),
      triggeredAt: new Date(row.triggered_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      status: row.status,
      notificationChannels: JSON.parse(row.notification_channels || '[]'),
    };
  }

  private normalizePaginationValue(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      return fallback;
    }

    return Math.floor(value);
  }
}

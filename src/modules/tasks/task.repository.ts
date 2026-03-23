import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getDatabase } from '../../shared/database';
import { InspectionTask } from '../../types/models';
import { v4 as uuidv4 } from 'uuid';

export interface TaskFilter {
  name?: string;
  enabled?: boolean;
  tags?: string[];
  createdBy?: string;
}

export class TaskRepository {
  async create(task: Omit<InspectionTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const db = getDatabase();
    const id = uuidv4();

    const sql = `
      INSERT INTO inspection_tasks (
        id, name, description, enabled,
        frequency_type, frequency_interval, frequency_cron,
        api_url, api_method, api_headers, api_query_params, api_body, api_timeout,
        validation_rules, alert_rules, environments, fluctuation_monitors, tags,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(sql, [
      id,
      task.name,
      task.description || null,
      task.enabled,
      task.frequency.type,
      task.frequency.interval,
      task.frequency.cron || null,
      task.apiEndpoint.url,
      task.apiEndpoint.method,
      JSON.stringify(task.apiEndpoint.headers || {}),
      JSON.stringify(task.apiEndpoint.queryParams || {}),
      JSON.stringify(task.apiEndpoint.body || null),
      task.apiEndpoint.timeout,
      JSON.stringify(task.validationRules),
      JSON.stringify(task.alertRules),
      JSON.stringify(task.environments || []),
      JSON.stringify(task.fluctuationMonitors || []),
      JSON.stringify(task.tags),
      task.createdBy,
    ]);

    return id;
  }

  async findById(id: string): Promise<InspectionTask | null> {
    const db = getDatabase();
    const sql = 'SELECT * FROM inspection_tasks WHERE id = ?';
    const [rows] = await db.execute<RowDataPacket[]>(sql, [id]);

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToTask(rows[0]);
  }

  async findAll(filter: TaskFilter = {}): Promise<InspectionTask[]> {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.name) {
      conditions.push('name LIKE ?');
      params.push(`%${filter.name}%`);
    }

    if (filter.enabled !== undefined) {
      conditions.push('enabled = ?');
      params.push(filter.enabled);
    }

    if (filter.createdBy) {
      conditions.push('created_by = ?');
      params.push(filter.createdBy);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM inspection_tasks ${whereClause} ORDER BY created_at DESC`;

    const [rows] = await db.execute<RowDataPacket[]>(sql, params);

    let tasks = rows.map((row) => this.mapRowToTask(row));

    // 标签过滤（在应用层处理）
    if (filter.tags && filter.tags.length > 0) {
      tasks = tasks.filter((task) =>
        filter.tags!.some((tag) => task.tags.includes(tag))
      );
    }

    return tasks;
  }

  async update(id: string, updates: Partial<InspectionTask>): Promise<void> {
    const db = getDatabase();
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      params.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description);
    }

    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      params.push(updates.enabled);
    }

    if (updates.frequency) {
      fields.push('frequency_type = ?', 'frequency_interval = ?', 'frequency_cron = ?');
      params.push(
        updates.frequency.type,
        updates.frequency.interval,
        updates.frequency.cron || null
      );
    }

    if (updates.apiEndpoint) {
      fields.push(
        'api_url = ?',
        'api_method = ?',
        'api_headers = ?',
        'api_query_params = ?',
        'api_body = ?',
        'api_timeout = ?'
      );
      params.push(
        updates.apiEndpoint.url,
        updates.apiEndpoint.method,
        JSON.stringify(updates.apiEndpoint.headers || {}),
        JSON.stringify(updates.apiEndpoint.queryParams || {}),
        JSON.stringify(updates.apiEndpoint.body || null),
        updates.apiEndpoint.timeout
      );
    }

    if (updates.validationRules) {
      fields.push('validation_rules = ?');
      params.push(JSON.stringify(updates.validationRules));
    }

    if (updates.alertRules) {
      fields.push('alert_rules = ?');
      params.push(JSON.stringify(updates.alertRules));
    }

    if (updates.environments) {
      fields.push('environments = ?');
      params.push(JSON.stringify(updates.environments));
    }

    if (updates.fluctuationMonitors) {
      fields.push('fluctuation_monitors = ?');
      params.push(JSON.stringify(updates.fluctuationMonitors));
    }

    if (updates.tags) {
      fields.push('tags = ?');
      params.push(JSON.stringify(updates.tags));
    }

    if (updates.lastExecutedAt) {
      fields.push('last_executed_at = ?');
      params.push(updates.lastExecutedAt);
    }

    if (fields.length === 0) {
      return;
    }

    params.push(id);
    const sql = `UPDATE inspection_tasks SET ${fields.join(', ')} WHERE id = ?`;
    await db.execute(sql, params);
  }

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    const sql = 'DELETE FROM inspection_tasks WHERE id = ?';
    await db.execute<ResultSetHeader>(sql, [id]);
  }

  async toggleEnabled(id: string, enabled: boolean): Promise<void> {
    const db = getDatabase();
    const sql = 'UPDATE inspection_tasks SET enabled = ? WHERE id = ?';
    await db.execute(sql, [enabled, id]);
  }

  async batchToggleEnabled(ids: string[], enabled: boolean): Promise<void> {
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE inspection_tasks SET enabled = ? WHERE id IN (${placeholders})`;
    await db.execute(sql, [enabled, ...ids]);
  }

  async duplicate(id: string, createdBy: string): Promise<string> {
    const original = await this.findById(id);
    if (!original) {
      throw new Error('任务不存在');
    }

    const newTask = {
      ...original,
      name: `${original.name} (副本)`,
      enabled: false,
      createdBy,
    };

    // 移除不需要复制的字段
    delete (newTask as any).id;
    delete (newTask as any).createdAt;
    delete (newTask as any).updatedAt;
    delete (newTask as any).lastExecutedAt;

    return await this.create(newTask);
  }

  private mapRowToTask(row: RowDataPacket): InspectionTask {
    // 辅助函数：安全解析JSON（如果已经是对象则直接返回）
    const safeParseJSON = (value: any, defaultValue: any) => {
      if (value === null || value === undefined) {
        return defaultValue;
      }
      if (typeof value === 'object') {
        return value; // 已经是对象，直接返回
      }
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return defaultValue;
        }
      }
      return defaultValue;
    };

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      enabled: Boolean(row.enabled),
      frequency: {
        type: row.frequency_type,
        interval: row.frequency_interval,
        cron: row.frequency_cron,
      },
      apiEndpoint: {
        url: row.api_url,
        method: row.api_method,
        headers: safeParseJSON(row.api_headers, {}),
        queryParams: safeParseJSON(row.api_query_params, {}),
        body: safeParseJSON(row.api_body, null),
        timeout: row.api_timeout,
      },
      validationRules: safeParseJSON(row.validation_rules, []),
      alertRules: safeParseJSON(row.alert_rules, []),
      environments: safeParseJSON(row.environments, []),
      fluctuationMonitors: safeParseJSON(row.fluctuation_monitors, []),
      tags: safeParseJSON(row.tags, []),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastExecutedAt: row.last_executed_at ? new Date(row.last_executed_at) : undefined,
    };
  }
}

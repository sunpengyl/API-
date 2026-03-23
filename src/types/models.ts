// 核心数据模型类型定义

// ==================== 用户相关 ====================

export type UserRole = 'admin' | 'developer' | 'readonly';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== 巡检任务相关 ====================

export type FrequencyType = 'minute' | 'hour' | 'day';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ScheduleFrequency {
  type: FrequencyType;
  interval: number;
  cron?: string;
}

export interface ApiEndpoint {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
  timeout: number;
}

export interface Environment {
  name: string;
  apiEndpoint: ApiEndpoint;
}

export type ValidationType = 'exists' | 'type' | 'range' | 'pattern' | 'enum';
export type DataType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface ValidationConfig {
  expectedType?: DataType;
  min?: number;
  max?: number;
  pattern?: string;
  enumValues?: any[];
}

export interface ValidationRule {
  id: string;
  fieldPath: string;
  ruleType: ValidationType;
  config: ValidationConfig;
  required: boolean;
}

export type AlertType =
  | 'consecutive_failure'
  | 'response_time_exceeded'
  | 'validation_failed'
  | 'value_fluctuation'
  | 'health_score_low';

export type NotificationChannel = 'email' | 'wechat' | 'dingtalk' | 'sms';

export interface AlertCondition {
  consecutiveFailures?: number;
  responseTimeThreshold?: number;
  healthScoreThreshold?: number;
  fluctuationSensitivity?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  condition: AlertCondition;
  notificationChannels: NotificationChannel[];
  enabled: boolean;
}

export interface FluctuationMonitor {
  id: string;
  fieldPath: string;
  sensitivity: number;
  enabled: boolean;
}

export interface InspectionTask {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  frequency: ScheduleFrequency;
  apiEndpoint: ApiEndpoint;
  validationRules: ValidationRule[];
  alertRules: AlertRule[];
  environments?: Environment[];
  fluctuationMonitors?: FluctuationMonitor[];
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
}

// ==================== 巡检结果相关 ====================

export interface FieldValidationResult {
  fieldPath: string;
  ruleId: string;
  passed: boolean;
  expectedValue?: any;
  actualValue?: any;
  message?: string;
}

export interface ErrorDetail {
  code: string;
  message: string;
  stack?: string;
}

export interface InspectionResult {
  id: string;
  taskId: string;
  executedAt: Date;
  success: boolean;
  statusCode?: number;
  responseTime: number;
  response?: any;
  validationResults: FieldValidationResult[];
  error?: ErrorDetail;
  environment?: string;
}

// ==================== 告警相关 ====================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertStatus = 'active' | 'resolved' | 'suppressed';

export interface Alert {
  id: string;
  taskId: string;
  ruleId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  details: any;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: AlertStatus;
  notificationChannels: NotificationChannel[];
}

// ==================== 健康度评分相关 ====================

export type HealthLevel = 'excellent' | 'good' | 'warning' | 'critical';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface HealthScore {
  id: string;
  taskId: string;
  score: number;
  level: HealthLevel;
  successRate: number;
  avgResponseTime: number;
  validationPassRate: number;
  calculatedAt: Date;
  timeRange: TimeRange;
}

// ==================== 统计相关 ====================

export interface ResponseTimeStats {
  taskId: string;
  timeRange: TimeRange;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  totalRequests: number;
}

export type MetricType = 'success_rate' | 'response_time' | 'health_score';

export interface DataPoint {
  timestamp: Date;
  value: number;
}

export interface TrendData {
  taskId: string;
  metric: MetricType;
  timeRange: TimeRange;
  dataPoints: DataPoint[];
}

// ==================== 系统配置相关 ====================

export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
}

// ==================== 审计日志相关 ====================

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: Date;
}

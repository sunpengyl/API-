-- API巡检与告警平台 - 数据库初始化脚本

-- 创建数据库
CREATE DATABASE IF NOT EXISTS api_inspection DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE api_inspection;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY COMMENT '用户ID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码（加密）',
    role ENUM('admin', 'developer', 'readonly') NOT NULL DEFAULT 'developer' COMMENT '角色',
    email VARCHAR(100) COMMENT '邮箱',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 巡检任务表
CREATE TABLE IF NOT EXISTS inspection_tasks (
    id VARCHAR(36) PRIMARY KEY COMMENT '任务ID',
    name VARCHAR(100) NOT NULL COMMENT '任务名称',
    description TEXT COMMENT '任务描述',
    enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    
    -- 执行频率配置（JSON）
    frequency_type ENUM('minute', 'hour', 'day') NOT NULL COMMENT '频率类型',
    frequency_interval INT NOT NULL COMMENT '间隔数值',
    frequency_cron VARCHAR(100) COMMENT 'Cron表达式',
    
    -- API端点配置（JSON）
    api_url VARCHAR(500) NOT NULL COMMENT 'API地址',
    api_method ENUM('GET', 'POST', 'PUT', 'DELETE') NOT NULL DEFAULT 'GET' COMMENT 'HTTP方法',
    api_headers JSON COMMENT '请求头',
    api_query_params JSON COMMENT '查询参数',
    api_body JSON COMMENT '请求体',
    api_timeout INT NOT NULL DEFAULT 5000 COMMENT '超时时间（毫秒）',
    
    -- 校验规则（JSON数组）
    validation_rules JSON COMMENT '字段校验规则',
    
    -- 告警规则（JSON数组）
    alert_rules JSON COMMENT '告警规则',
    
    -- 环境配置（JSON数组）
    environments JSON COMMENT '环境配置',
    
    -- 波动监控配置（JSON数组）
    fluctuation_monitors JSON COMMENT '波动监控配置',
    
    -- 标签
    tags JSON COMMENT '标签',
    
    -- 元数据
    created_by VARCHAR(36) NOT NULL COMMENT '创建人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_executed_at TIMESTAMP NULL COMMENT '最后执行时间',
    
    INDEX idx_enabled (enabled),
    INDEX idx_created_by (created_by),
    INDEX idx_name (name),
    INDEX idx_last_executed_at (last_executed_at),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='巡检任务表';

-- 3. 巡检结果表
CREATE TABLE IF NOT EXISTS inspection_results (
    id VARCHAR(36) PRIMARY KEY COMMENT '结果ID',
    task_id VARCHAR(36) NOT NULL COMMENT '任务ID',
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
    success BOOLEAN NOT NULL COMMENT '是否成功',
    status_code INT COMMENT 'HTTP状态码',
    response_time INT NOT NULL COMMENT '响应时间（毫秒）',
    response_body JSON COMMENT '响应内容',
    validation_results JSON COMMENT '字段校验结果',
    error_code VARCHAR(50) COMMENT '错误码',
    error_message TEXT COMMENT '错误消息',
    error_stack TEXT COMMENT '错误堆栈',
    environment VARCHAR(50) COMMENT '环境名称',
    
    INDEX idx_task_id (task_id),
    INDEX idx_executed_at (executed_at),
    INDEX idx_success (success),
    INDEX idx_task_executed (task_id, executed_at),
    FOREIGN KEY (task_id) REFERENCES inspection_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='巡检结果表';

-- 4. 告警表
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(36) PRIMARY KEY COMMENT '告警ID',
    task_id VARCHAR(36) NOT NULL COMMENT '任务ID',
    rule_id VARCHAR(36) NOT NULL COMMENT '告警规则ID',
    type ENUM('consecutive_failure', 'response_time_exceeded', 'validation_failed', 'value_fluctuation', 'health_score_low') NOT NULL COMMENT '告警类型',
    severity ENUM('info', 'warning', 'error', 'critical') NOT NULL COMMENT '严重程度',
    title VARCHAR(200) NOT NULL COMMENT '告警标题',
    message TEXT NOT NULL COMMENT '告警消息',
    details JSON COMMENT '详细信息',
    triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '触发时间',
    resolved_at TIMESTAMP NULL COMMENT '解决时间',
    status ENUM('active', 'resolved', 'suppressed') NOT NULL DEFAULT 'active' COMMENT '告警状态',
    notification_channels JSON COMMENT '通知渠道',
    
    INDEX idx_task_id (task_id),
    INDEX idx_status (status),
    INDEX idx_triggered_at (triggered_at),
    INDEX idx_task_status (task_id, status),
    FOREIGN KEY (task_id) REFERENCES inspection_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='告警表';

-- 5. 健康度评分表
CREATE TABLE IF NOT EXISTS health_scores (
    id VARCHAR(36) PRIMARY KEY COMMENT '评分ID',
    task_id VARCHAR(36) NOT NULL COMMENT '任务ID',
    score DECIMAL(5,2) NOT NULL COMMENT '评分（0-100）',
    level ENUM('excellent', 'good', 'warning', 'critical') NOT NULL COMMENT '评分等级',
    success_rate DECIMAL(5,2) NOT NULL COMMENT '成功率',
    avg_response_time INT NOT NULL COMMENT '平均响应时间',
    validation_pass_rate DECIMAL(5,2) NOT NULL COMMENT '字段校验通过率',
    calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '计算时间',
    time_range_start TIMESTAMP NOT NULL COMMENT '统计开始时间',
    time_range_end TIMESTAMP NOT NULL COMMENT '统计结束时间',
    
    INDEX idx_task_id (task_id),
    INDEX idx_calculated_at (calculated_at),
    INDEX idx_task_calculated (task_id, calculated_at),
    FOREIGN KEY (task_id) REFERENCES inspection_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康度评分表';

-- 6. 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
    config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
    config_value TEXT NOT NULL COMMENT '配置值',
    description VARCHAR(200) COMMENT '配置描述',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by VARCHAR(36) COMMENT '更新人ID',
    
    INDEX idx_config_key (config_key),
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 7. 操作审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    action VARCHAR(50) NOT NULL COMMENT '操作类型',
    resource_type VARCHAR(50) NOT NULL COMMENT '资源类型',
    resource_id VARCHAR(36) COMMENT '资源ID',
    details JSON COMMENT '操作详情',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作审计日志表';

-- 插入默认管理员用户（默认密码由初始化脚本生成强密码并替换占位符）
-- 使用固定ID以便前端可以引用
-- 先删除可能存在的admin用户，然后插入新的
DELETE FROM users WHERE username = 'admin';
INSERT INTO users (id, username, password, role, email) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin',
    '$2a$10$placeholder_hash_will_be_replaced',
    'admin',
    'admin@example.com'
);

-- 插入默认系统配置
INSERT INTO system_configs (id, config_key, config_value, description) VALUES
(UUID(), 'data_retention_days', '30', '数据保留期限（天）'),
(UUID(), 'default_response_time_threshold', '5000', '默认响应时间阈值（毫秒）'),
(UUID(), 'max_concurrent_tasks', '10', '最大并发任务数')
ON DUPLICATE KEY UPDATE config_key=config_key;

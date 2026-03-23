# 数据库说明

## 初始化方式

### 方式一：使用初始化脚本

```bash
npm run db:init
```

### 方式二：手动执行 SQL

```bash
mysql -u root -p < database/migrations/001_create_tables.sql
```

## 主要数据表

- `users`：用户表
- `inspection_tasks`：巡检任务表
- `inspection_results`：巡检结果表
- `alerts`：告警表
- `health_scores`：健康度评分表
- `system_configs`：系统配置表
- `audit_logs`：审计日志表

## 说明

- 任务、告警规则、标签等采用 JSON 字段存储
- 巡检记录中保存状态码、响应时间、错误信息和校验结果
- 健康度表保存评分、成功率、平均响应时间和统计窗口

## 默认数据

初始化脚本会创建：

- 默认管理员账号
- 默认系统配置

首次部署后请尽快修改管理员密码。

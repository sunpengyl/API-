# API 巡检平台

一个用于 API 定时巡检、结果追踪、告警记录和健康度分析的全栈项目。

## 功能概览

- 任务管理：创建、编辑、启停、复制巡检任务
- 定时巡检：按分钟、小时、天自动执行
- 巡检记录：查看执行结果、状态码、响应时间和错误信息
- 告警记录：查看活跃告警和历史告警
- 健康度分析：评分、成功率、响应时间统计和图表分析
- 认证鉴权：登录、修改密码、基础权限控制

## 技术栈

- 后端：Node.js、TypeScript、Express、MySQL、node-cron
- 前端：Vue 3、TypeScript、Element Plus、ECharts、Vite
- 测试：Vitest

## 项目结构

```text
.
├─ src/                  后端源码
├─ frontend/             前端源码
├─ database/             数据库脚本与说明
├─ scripts/              初始化脚本
├─ test/                 测试文件
├─ package.json          后端依赖
└─ frontend/package.json 前端依赖
```

## 快速开始

### 1. 安装依赖

后端：

```bash
npm install
```

前端：

```bash
cd frontend
npm install
```

### 2. 配置环境变量

复制环境变量模板：

```bash
copy .env.example .env
```

然后按你的本地环境修改数据库和 JWT 配置。

### 3. 初始化数据库

```bash
npm run db:init
```

或者手动执行：

```bash
mysql -u root -p < database/migrations/001_create_tables.sql
```

### 4. 启动项目

后端：

```bash
npm run dev
```

前端：

```bash
cd frontend
npm run dev
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`

## 构建

后端：

```bash
npm run build
```

前端：

```bash
cd frontend
npm run build
```

## 相关文档

- [前端说明](./frontend/README.md)
- [数据库说明](./database/README.md)
- [部署说明](./DEPLOYMENT.md)

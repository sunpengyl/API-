# 前端说明

前端基于 Vue 3 + TypeScript + Element Plus + ECharts。

## 安装依赖

```bash
cd frontend
npm install
```

## 本地开发

```bash
npm run dev
```

默认启动地址：

```text
http://localhost:5173
```

## 生产构建

```bash
npm run build
```

## 说明

- 前端通过 Vite 代理访问后端 `/api`
- 请先启动后端服务
- 当前包含任务管理、巡检记录、告警记录、健康度分析等页面

# 部署说明

## 环境要求

- Node.js 18 及以上
- MySQL 8.0 及以上
- npm 10 及以上

## 一、部署后端

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制模板：

```bash
copy .env.example .env
```

关键配置项：

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=api_inspection
JWT_SECRET=请替换成你自己的密钥
JWT_EXPIRES_IN=7d
```

### 3. 初始化数据库

```bash
npm run db:init
```

### 4. 构建并启动

```bash
npm run build
npm run start
```

## 二、部署前端

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 构建

```bash
npm run build
```

构建产物位于：

```text
frontend/dist
```

可将该目录部署到 Nginx、静态文件服务器或云平台。

## 三、Nginx 反向代理示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 四、上线前检查

- 确认 `.env` 未提交到仓库
- 确认数据库已初始化
- 确认默认管理员密码已修改
- 确认前后端端口与代理配置一致
- 确认生产环境只运行一个后端实例，避免重复调度

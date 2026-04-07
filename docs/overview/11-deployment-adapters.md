# Deployment Adapters

astro-koharu 支持自动检测部署平台并选择对应的适配器。

## 支持的平台

| 平台              | 适配器            | 环境变量检测     |
| ----------------- | ----------------- | ---------------- |
| **Vercel**        | `@astrojs/vercel` | `VERCEL=1`       |
| **Netlify**       | `@astrojs/netlify`| `NETLIFY=true`   |
| **自托管/Docker** | `@astrojs/node`   | 其他情况（保底） |

## 部署说明

### Vercel

1. 连接 GitHub 仓库到 Vercel
2. 自动检测并使用 `@astrojs/vercel` 适配器
3. 一键部署：[Deploy with Vercel](https://vercel.com/new/clone?repository-url=https://github.com/cosZone/astro-koharu)

### Netlify

1. 连接 GitHub 仓库到 Netlify
2. 构建命令：`pnpm build`
3. 发布目录：`dist`
4. 自动使用 `@astrojs/netlify` 适配器

### 自托管（Node.js）

```bash
# 构建
pnpm build

# 运行
node dist/server/entry.mjs
```

### Docker 部署

项目提供了完整的 Docker 部署方案：多阶段构建（`node:22-alpine` 构建静态文件 → `nginx:alpine` 托管服务），最终镜像仅包含 nginx + 静态资源。

#### 前置要求

- Docker Engine 20.10+
- Docker Compose V2 (`docker compose` 命令)

#### 快速开始

**1. 配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env` 填入你的配置：

```bash
# 博客端口（默认 4321）
BLOG_PORT=4321
```

> 评论系统和统计分析等配置已迁移到 `config/site.yaml`，无需通过环境变量注入。

**2. 构建并启动**

```bash
# 使用 pnpm 快捷命令
pnpm docker:up

# 或手动执行完整命令
docker compose --env-file ./.env -f docker/docker-compose.yml up -d --build
```

访问 `http://localhost:4321`（或你配置的 `BLOG_PORT`）。

**3. 日常管理**

```bash
pnpm docker:logs      # 查看实时日志
pnpm docker:down      # 停止并移除容器
pnpm docker:rebuild   # 完整重建（停旧容器 → 重新构建 → 启动）
```

#### 更新内容后重新部署

当修改了博客内容、`config/site.yaml` 或 `.env` 后：

```bash
# 建议先生成内容资产（LQIP、相似度、AI 摘要）
pnpm koharu generate all

# 然后重新构建部署
pnpm docker:rebuild
```

`rebuild.sh` 会自动检查 `.env` 是否存在，并提示是否需要运行内容生成脚本。

#### 目录结构

```plain
docker/
├── Dockerfile            # 多阶段构建（builder → nginx）
├── docker-compose.yml    # 服务编排
├── nginx/
│   └── default.conf      # nginx 配置（gzip、缓存、安全头、SPA 路由）
└── rebuild.sh            # 一键重建脚本
```

#### nginx 配置说明

`docker/nginx/default.conf` 包含以下优化：

- **Gzip 压缩**：JS/CSS/SVG/JSON 等资源自动压缩
- **静态资源长缓存**：`js/css/图片/字体` 设置 1 年缓存 + `immutable`
- **HTML 短缓存**：1 小时 + `must-revalidate`
- **安全头**：`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`
- **Astro 路由**：`try_files $uri $uri/index.html =404` 匹配静态输出格式
- **Pagefind 搜索**：独立缓存策略（1 天）

#### 自定义反向代理

如果在 nginx/Caddy 等反向代理后面运行，将端口映射改为仅绑定 127.0.0.1：

```yaml
# docker-compose.yml
ports:
  - "127.0.0.1:${BLOG_PORT:-4321}:80"
```

然后在外层反向代理中配置转发到该端口。

#### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `BLOG_PORT` | 主机端口映射 | `4321` |

## 本地测试

测试特定平台适配器：

```bash
# Vercel
VERCEL=1 NODE_ENV=production pnpm build

# Netlify
NETLIFY=true NODE_ENV=production pnpm build

# Node.js (默认)
NODE_ENV=production pnpm build
```

## 相关文档

- [Astro 按需渲染](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Vercel 适配器](https://docs.astro.build/en/guides/integrations-guide/vercel/)
- [Netlify 适配器](https://docs.astro.build/en/guides/integrations-guide/netlify/)
- [Node 适配器](https://docs.astro.build/en/guides/integrations-guide/node/)

# Deployment Adapters

astro-koharu 默认使用 Astro 的静态输出模式。`pnpm build` 会生成可由任意静态文件服务器托管的 `dist/` 目录，项目不会自动检测部署平台或选择 SSR adapter。

## 支持的平台

| 平台              | 部署方式                             | 发布内容 |
| ----------------- | ------------------------------------ | -------- |
| **Vercel**        | 静态站点                             | `dist/`  |
| **Netlify**       | 静态站点                             | `dist/`  |
| **自托管/Docker** | 静态文件服务器（项目默认使用 nginx） | `dist/`  |

## 部署说明

### Vercel

1. 连接 GitHub 仓库到 Vercel
2. 使用构建命令 `pnpm build`；Vercel 会发布 Astro 生成的静态站点
3. 一键部署：[Deploy with Vercel](https://vercel.com/new/clone?repository-url=https://github.com/cosZone/astro-koharu)

### Netlify

1. 连接 GitHub 仓库到 Netlify
2. 构建命令：`pnpm build`
3. 发布目录：`dist`

### 自托管（静态服务器）

```bash
# 构建
pnpm build

# 使用任意静态文件服务器发布 dist，例如本地预览
pnpm preview
```

生产环境可将 `dist/` 交给 nginx、Caddy 或其他静态文件服务器；默认构建不会生成 `dist/server/entry.mjs`。

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

构建并预览静态输出：

```bash
pnpm build
pnpm preview
```

## 相关文档

- [Astro 静态部署](https://docs.astro.build/en/guides/deploy/)
- [Vercel 部署](https://docs.astro.build/en/guides/deploy/vercel/)
- [Netlify 部署](https://docs.astro.build/en/guides/deploy/netlify/)

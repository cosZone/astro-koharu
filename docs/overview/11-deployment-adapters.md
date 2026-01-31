# Deployment Adapters

astro-koharu 支持自动检测部署平台并选择对应的适配器。

## 支持的平台

| 平台                         | 适配器                | 环境变量检测                 |
| ---------------------------- | --------------------- | ---------------------------- |
| **Vercel**                   | `@astrojs/vercel`     | `VERCEL=1`                   |
| **Cloudflare Pages/Workers** | `@astrojs/cloudflare` | `CF_PAGES=1` 或 `CLOUDFLARE` |
| **Netlify**                  | `@astrojs/netlify`    | `NETLIFY=true`               |
| **自托管/Docker**            | `@astrojs/node`       | 其他情况（保底）             |

## 部署说明

### Vercel

1. 连接 GitHub 仓库到 Vercel
2. 自动检测并使用 `@astrojs/vercel` 适配器
3. 一键部署：[Deploy with Vercel](https://vercel.com/new/clone?repository-url=https://github.com/cosZone/astro-koharu)

### Cloudflare Pages

1. 连接 GitHub 仓库到 Cloudflare Pages
2. 构建命令：`pnpm build`
3. 输出目录：`dist`
4. 自动使用 `@astrojs/cloudflare` 适配器

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

或使用 Docker（见 `/docker` 目录）：

```bash
./docker/rebuild.sh
```

## 本地测试

测试特定平台适配器：

```bash
# Vercel
VERCEL=1 NODE_ENV=production pnpm build

# Cloudflare
CF_PAGES=1 NODE_ENV=production pnpm build

# Netlify
NETLIFY=true NODE_ENV=production pnpm build

# Node.js (默认)
NODE_ENV=production pnpm build
```

## 相关文档

- [Astro 按需渲染](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Vercel 适配器](https://docs.astro.build/en/guides/integrations-guide/vercel/)
- [Cloudflare 适配器](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Netlify 适配器](https://docs.astro.build/en/guides/integrations-guide/netlify/)
- [Node 适配器](https://docs.astro.build/en/guides/integrations-guide/node/)

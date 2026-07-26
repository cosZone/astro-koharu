# Deployment Adapters

astro-koharu 提供两条明确分离的部署路径：默认的 **static nginx** 与启用碎碎念时使用的
**dynamic Astro Node standalone**。默认仍是纯静态站；安装或升级代码不会自动开启动态能力。

## 模式对照

| 模式 | 适用场景 | 运行时 | suite 要求 | 端口 |
|---|---|---|---|---:|
| Static（默认） | 普通博客，碎碎念关闭 | nginx，仅托管 `dist/` | 无 | 容器 80 |
| Dynamic（可选） | `moments.enabled: true` | Astro Node standalone | 公开 `KOHARU_SUITE_URL` | 容器 4321 |

两种模式共用同一个 Dockerfile。默认和历史 `production` target 都指向 nginx；只有显式选择
`dynamic` target 才会安装 production Node dependencies，并运行 `node dist/server/entry.mjs`。

## 默认静态部署

`pnpm build` 使用 Astro 静态输出，生成可由任意静态文件服务器托管的 `dist/`。Vercel、Netlify、
nginx 或 Caddy 都可直接发布此目录。碎碎念关闭时：

- 不要求或读取 `KOHARU_SUITE_URL`；
- 不注册 Node adapter、Live Collection 或动态路由；
- 构建不会向 suite 发出请求；
- 现有 Git Markdown 文章、Pagefind 和 RSS 保持静态。

Docker 快速开始：

```bash
cp .env.example .env
pnpm docker:up
```

也可以手工运行：

```bash
docker compose --env-file ./.env -f docker/docker-compose.yml up -d --build
```

访问 `http://localhost:4321`（或 `.env` 中的 `BLOG_PORT`）。现有命令保持不变：

```bash
pnpm docker:logs
pnpm docker:down
pnpm docker:rebuild
```

`docker/rebuild.sh` 会检查 `.env` 并提示内容资产生成。默认 nginx 配置继续提供 gzip、静态资源长缓存、
HTML 短缓存、安全头、Astro 静态路由和 Pagefind 资源策略。

## 可选动态部署

动态模式只用于已经在 `config/site.yaml` 设置 `moments.enabled: true` 的站点。先设置公开 suite
origin：

```env
BLOG_PORT=4321
KOHARU_SUITE_URL=https://suite.example.com
```

这个 origin 必须同时能被 Astro Node 容器与终端用户的浏览器访问。不要使用容器内部 hostname，
也不要包含 admin token、database URL 或任何凭据。启动时使用：

```bash
pnpm docker:up:dynamic
pnpm docker:logs:dynamic
```

等价的 Compose 命令是：

```bash
docker compose --env-file ./.env -f docker/docker-compose.dynamic.yml up -d --build
```

`docker-compose.yml` 与 `docker-compose.dynamic.yml` 使用相同的 Compose project/service 名，因此在两种
模式之间切换时会替换同一服务，不会同时争用 `${BLOG_PORT:-4321}`。停止动态部署：

```bash
pnpm docker:down:dynamic
```

动态 build 把 `KOHARU_SUITE_URL` 传给配置校验，运行容器也获得相同变量。构建只检查 URL 格式，
不会探测 suite 是否在线；因此 suite 暂时不可用不会阻止镜像构建或进程启动。

## 健康检查与故障隔离

两种镜像都只使用静态首页 `/` 作为 liveness。动态镜像不会把碎碎念或 suite health 当作容器健康
条件，避免 suite 短暂离线导致博客重启循环。

- suite 正常时，碎碎念页面按请求读取公开 API。
- suite 无响应、超时、返回 5xx 或非法数据时，未缓存的碎碎念请求返回带站点外壳的 503。
- rate limit 保留为 429；不存在的公开资源为 404。
- 失败响应不进入正常页面缓存，Node process 不会因单次请求失败退出。
- 首页、文章和其他预渲染页面继续由 Node standalone 直接提供，故障时仍应返回 200。

不提供额外 moments health endpoint，也不会把 suite 凭据、响应正文或内部 stack trace 暴露给页面。

## 缓存边界

默认 dynamic 容器使用 Astro 单进程 `memoryCache({ max: 1000 })`：

- feed、detail、RSS：300 秒；
- search：60 秒；
- suite client fetch 仍为 `no-store`；
- `X-Astro-Cache` 可用于验证 `MISS`、`HIT` 和 provider 支持时的 `STALE`。

内存缓存随重启丢失，只适合单实例。多副本部署必须使用经过真实验证的共享 CDN、反向代理或
distributed provider。裸 Astro Node 不保证 24 小时 stale-on-error，不能只凭 `Cache-Control` 或
SWR 推导这个承诺。

## 反向代理与多实例

建议在公网入口使用 TLS reverse proxy，并把本机端口只绑定到 loopback：

```yaml
ports:
  - "127.0.0.1:${BLOG_PORT:-4321}:4321"
```

代理应保留标准缓存头和 `X-Astro-Cache`，但只有在已经验证错误状态、query cache key 与 purge 行为
后，才能声明额外的 stale-on-error。多实例还需要共享缓存，不能把每个 Node process 的内存缓存
视为一致。

## 配置变更与回滚

以下内容属于构建期配置，修改后需要重建：

- `moments.enabled`、`moments.path`、标题、描述与 OG；
- channel override、slug、alias、hidden、primary 与顺序；
- navigation 的 `feature: moments` 占位。

suite 中新增或编辑消息不需要重新构建。回滚动态能力时，将 `moments.enabled` 改回 `false`，重新构建
并运行 `pnpm docker:up` 即可；前端回滚不会修改 koharu-suite 的归档数据。

## 验证

静态模式：

```bash
pnpm build
pnpm docker:up
curl --fail http://127.0.0.1:4321/
```

动态模式：

```bash
pnpm docker:up:dynamic
pnpm test:moments:docker
```

`MOMENTS_PATH=life/moments pnpm test:moments:docker` 可检查自定义 path。完整的真实频道验收流程见
[碎碎念指南](../features/moments.md)。测试必须使用从公开仓库创建的独立 checkout 和合成/明确授权的
公开频道，不得读取或复制私人博客内容。

## 目录结构

```plain
docker/
├── Dockerfile                    # builder + dynamic + static/production targets
├── docker-compose.yml            # 默认 nginx 部署
├── docker-compose.dynamic.yml    # 可选 Astro Node standalone 部署
├── smoke-dynamic.sh              # 首页与碎碎念入口 smoke
├── nginx/
│   └── default.conf
└── rebuild.sh
```

## 相关文档

- [Koharu 双服务部署样例](../../deploy/koharu-stack/README.md)
- [碎碎念配置与验收](../features/moments.md)
- [Astro 静态部署](https://docs.astro.build/en/guides/deploy/)
- [Astro Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/)
- [Astro on-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/)

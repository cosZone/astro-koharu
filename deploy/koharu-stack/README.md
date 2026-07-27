# Koharu 双服务部署样例

这是一条面向个人博客的单机部署基线：一台 Linux VPS 同时运行 astro-koharu、koharu-suite、
PostgreSQL 18 和 Caddy。Caddy 为博客与 suite 两个子域名自动申请 HTTPS 证书；数据库、suite 与 Astro
端口只在 Docker 网络内开放。

> 这份样例要求已经公开发布的 astro-koharu 与 koharu-suite 精确版本。首次公开版本发布完成前，
> `.env.example` 中的版本号只是预定值，不能据此假定 GHCR 镜像已经存在。

## 你会得到什么

```text
Telegram public channel
          │
          ▼
   koharu-suite worker ──► PostgreSQL 18
          │                       │
          └──── media cache       ▼
                              suite server
                                    │
                                    ▼
Browser ──HTTPS──► Caddy ─────► astro-koharu
             └───────────────► Owner Desk / public API
```

- `https://blog.example.com/`：博客与 `/moments`。
- `https://suite.example.com/admin/`：Owner Desk。
- 对外只开放 `80/tcp`、`443/tcp` 与 `443/udp`。
- 只运行一个 Telegram worker。
- PostgreSQL 与 5 GiB 本地媒体缓存使用 Docker named volumes。

## 开始前

1. 准备一台安装了 Docker Engine 与 Compose v2 的 Linux 主机。
2. 把两个 DNS `A`/`AAAA` 记录指向这台主机，例如 `blog.example.com` 与 `suite.example.com`。
3. 放行 80 和 443；不要把 3000、4321、5432 暴露到公网。
4. 使用 BotFather 创建一个 Bot，把它设为所有目标**公开频道**的管理员。
5. 从 astro-koharu 的精确 Release tag checkout，并在 `config/site.yaml` 开启 Moments。

```yaml
moments:
  enabled: true
  path: moments
  title: 碎碎念
  description: 记录频道中的日常消息
```

## 1. 创建部署配置

在仓库根目录执行：

```bash
cp deploy/koharu-stack/.env.example deploy/koharu-stack/.env
chmod 600 deploy/koharu-stack/.env
```

`chmod 600` 让 `.env` 只对当前服务器用户可读写，避免同一台主机上的其他普通用户直接读取密码和 Bot token。

编辑 `.env`：

- 域名只写 hostname，不要带 `https://`、路径或结尾斜线。
- `KOHARU_IMAGE` 与 `ASTRO_KOHARU_VERSION` 使用 Release 中的精确版本。
- 用不同的高熵值填写 PostgreSQL 与 Better Auth secret。
- `TELEGRAM_BOT_TOKEN` 只保存在服务器 `.env`，不要发到 Issue、日志或截图。

可以生成两个 secret：

```bash
openssl rand -hex 32
openssl rand -hex 32
```

先让 Compose 展开并检查变量；输出可能包含 secret，不要把完整结果贴到公开位置：

```bash
docker compose --env-file deploy/koharu-stack/.env \
  -f deploy/koharu-stack/compose.yaml config --quiet
```

## 2. 初始化 suite

拉取镜像、启动 PostgreSQL 并运行 migration：

```bash
docker compose --env-file deploy/koharu-stack/.env \
  -f deploy/koharu-stack/compose.yaml pull postgres suite-migrate suite-server suite-worker caddy

docker compose --env-file deploy/koharu-stack/.env \
  -f deploy/koharu-stack/compose.yaml up -d postgres

docker compose --env-file deploy/koharu-stack/.env \
  -f deploy/koharu-stack/compose.yaml run --rm suite-migrate
```

添加第一个频道。即使频道链接里只看到一段正数，Telegram Bot API 使用的 channel ID 通常仍以 `-100` 开头：

```bash
docker compose --env-file deploy/koharu-stack/.env \
  -f deploy/koharu-stack/compose.yaml run --rm --no-deps suite-worker \
  node dist/cli.js channel add --telegram-id=-1001234567890
```

创建唯一 Owner；命令会交互式要求输入密码：

```bash
docker compose --env-file deploy/koharu-stack/.env \
  -f deploy/koharu-stack/compose.yaml run --rm --no-deps suite-server \
  node dist/cli.js owner create --email you@example.com
```

## 3. 启动完整服务

Astro 镜像会从当前 checkout 构建，因此包含你的文章与 `config/site.yaml`：

```bash
docker compose --env-file deploy/koharu-stack/.env \
  -f deploy/koharu-stack/compose.yaml up -d --build
```

Caddy 与 Astro 不等待 suite 或数据库健康后才启动：数据库临时不可用时，博客首页和反向代理仍能启动，
只有依赖 suite 的动态路由暂时失败。所有容器日志采用 `10 MiB × 5` 的轮转上限，避免默认 JSON 日志无限占用磁盘。

第一次启动时 Caddy 需要等待 DNS 生效并申请证书。查看状态与日志：

```bash
docker compose --env-file deploy/koharu-stack/.env \
  -f deploy/koharu-stack/compose.yaml ps

docker compose --env-file deploy/koharu-stack/.env \
  -f deploy/koharu-stack/compose.yaml logs --tail=100 caddy suite-server suite-worker astro-koharu
```

## 4. 验收

只传入两个公开域名并运行 smoke。脚本仍通过 Compose 的 `--env-file` 读取容器配置，不会把密码和 token
加载进当前 shell：

```bash
BLOG_DOMAIN=blog.example.com \
SUITE_DOMAIN=suite.example.com \
./deploy/koharu-stack/smoke.sh
```

如果 `config/site.yaml` 使用了自定义路径，把同一个相对路径作为参数传入，例如：

```bash
BLOG_DOMAIN=blog.example.com \
SUITE_DOMAIN=suite.example.com \
./deploy/koharu-stack/smoke.sh life/moments
```

然后人工完成一次最小链路：

1. 登录 `https://suite.example.com/admin/`，确认 Collector 运行中。
2. 在测试频道发送文字和普通图片。
3. 打开 `https://blog.example.com/moments`，确认消息、媒体、搜索、详情和“查看源消息”。
4. 编辑 Telegram 原消息，确认详情 URL 不变且页面显示“已更新”。
5. 打开 `/moments/rss.xml`，确认消息 GUID 稳定。

## 常见问题

### `KOHARU_SUITE_URL` 能写 `localhost:3000` 吗？

不能。Astro 运行在独立容器里，它的 `localhost` 指向自己。这个样例让 suite 的公开域名在 Docker
网络中解析到 Caddy，所以容器和浏览器都使用同一个 HTTPS origin。

### 为什么没有配置 CORS？

Astro 在服务端读取 suite API，浏览器不直接执行跨域 API 请求，因此默认不需要
`PUBLIC_CORS_ORIGINS`。如果以后自行增加浏览器端 API 调用，只添加精确 origin，不要使用 `*`。

### 可以启动两个 worker 吗？

不可以。同一个 Bot 的 updates 是单一流；Preview 只允许一个 worker。第二个 worker 会争抢或拒绝
取得 lock。

### 首页正常，但 `/moments` 返回 503

依次检查：

```bash
curl --fail https://suite.example.com/readyz
docker compose --env-file deploy/koharu-stack/.env \
  -f deploy/koharu-stack/compose.yaml exec suite-worker node dist/cli.js health worker
docker compose --env-file deploy/koharu-stack/.env \
  -f deploy/koharu-stack/compose.yaml logs --tail=100 suite-server astro-koharu
```

首页是已构建的静态内容，suite 故障只应影响 Moments 动态区域。

## 升级与备份

升级前先按 koharu-suite 部署手册生成 PostgreSQL custom-format 备份，并把备份复制到服务器外。只把
`.env` 中的镜像改为新的精确 tag，先运行 migration 与 doctor，再逐个恢复 worker、server、Astro。
不要使用 `latest`，也不要同时运行新旧 worker。

详细的 schema 兼容、媒体 cache 与回滚边界见：

- [Moments 配置](../../docs/features/moments.md)
- [Astro 部署架构](../../docs/overview/11-deployment-adapters.md)
- [koharu-suite 部署手册](https://github.com/cosZone/koharu-suite/blob/main/docs/deployment/README.md)

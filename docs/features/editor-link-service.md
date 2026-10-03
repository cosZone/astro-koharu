# 编辑器链接预览服务

公开编辑器的 Markdown、草稿和文章预览留在浏览器。只有符合本站链接卡片识别规则的网页 URL 会送往此服务，由服务读取标题、摘要和图片地址。浏览器受跨域读取限制，不能可靠地自行抓取任意网站。

本站编辑器使用同源 `GET /api/editor/og?url=<编码后的网页地址>`，返回博客使用的 `OGData` 字段和由 `renderLinkPreview` 生成的 `html`。抓取失败仍返回含 `error` 的数据及普通链接卡片，不承诺绕过登录、反爬或网站限制。客户端插入 HTML 前仍须净化内容。

## 运行方式

Vercel 使用平台自带的 Node 函数；自托管静态博客可以运行一个小型 Node 进程，无数据库、Redis、账号或新服务框架。开发与 CMS 可以把同一个 handler 注册到已有服务器；只注册 OG 接口，不会提供项目文件读写。

### Vercel 的 PR 预览和正式站点

仓库根目录的 `api/editor/og.ts` 是 Vercel Node Function，复用同一个 handler；`vercel.json` 为此函数设置十五秒预算，抓取内部仍限制八秒。提交到 PR 分支后，Vercel 自动把静态博客和这个同源接口一起部署。无需单独申请服务器、设置 `PUBLIC_EDITOR_OG_ENDPOINT`、开放 CORS 或配置数据库；编辑器继续请求 `/api/editor/og`。

部署完成并登录该预览的 Vercel 保护页面后，可以在浏览器打开下面的地址验证。把域名换成该 PR 的实际预览域名：

```text
https://<preview>.vercel.app/api/editor/og?url=https%3A%2F%2Fexample.com
```

成功响应应含 `title`、`description` 和 `html`；返回包含 `error` 的链接卡片表示接口已接入但目标网站抓取失败。缺少 `url` 时应返回 HTTP 400 JSON，这也能区分函数路由与静态 404。同源请求保留托管平台的预览登录态；填写其它实例时不发送 Cookie 或认证凭据。Vercel 的预览登录保护同时适用于页面和接口；未登录的命令行请求可能被转到登录页面，不能把它当作接口运行成功。

函数必须使用 Node 运行时，不能换成 Edge，因为 DNS 校验与固定连接需要 Node/undici。缓存、并发和请求预算属于每个函数实例，冷启动清空缓存；扩容后不构成跨实例全局限流，需要更严格的公开流量限制时在 Vercel Firewall 配置。此路由不监听额外端口，也不会公开 CMS 文件接口。Node 代码不记录查询网址；平台自带的访问日志与保留策略由托管平台管理。

参考：[Vercel Node 函数](https://vercel.com/docs/functions/runtimes/node-js)、[函数时长配置](https://vercel.com/docs/functions/configuring-functions/duration)。

### 静态博客与 OG 一起部署

仓库提供 `deploy/editor/compose.yaml`，使用现有静态博客 Dockerfile 构建 nginx 博客，另外运行独立 OG 容器。此配置适用于静态部署（`moments.enabled: false`）；已有动态博客可只构建 OG 镜像接入自己的反代。无需改动原来的 `docker/` 部署文件。

在仓库根目录执行：

```sh
docker compose -f deploy/editor/compose.yaml config --quiet
docker compose -f deploy/editor/compose.yaml up -d --build
```

默认通过 `http://localhost:4321/editor` 使用。可用 `BLOG_PORT=8080` 调整宿主端口，生产环境沿用自己的域名与 HTTPS 入口。这个 Compose 是独立的静态部署入口，不要同时在同一端口再启动旧的博客 Compose。

`deploy/editor/nginx.conf` 保留原静态路由和缓存设置，只把 `/api/editor/og` 代理到容器内的 `editor-og:4323`。OG 端口不发布到宿主机，健康检查只请求本地参数校验，不访问外网。Node 以非 root 用户运行、文件系统只读、退出宽限十二秒；内存上限 256 MiB。

OG 镜像使用独立的 `deploy/editor/package.json` 与冻结锁文件，仅安装现有 metascraper 插件、sanitize-html、undici、tsx 及其传递依赖。只复制三个服务模块、CLI 和博客 HTML 卡片模板；Dockerfile 专用忽略文件限制构建上下文，不带博客文章、CMS、BlockNote、机器学习依赖或 `.env`。因此根项目新增依赖不会自动进入 OG 镜像。升级这些运行依赖时，应同步更新独立锁文件并重新验证最小运行环境。

### 接入现有静态托管

已有 nginx 或其他静态托管无需重建博客部署，可以只构建并运行 OG 镜像：

```sh
docker build -f deploy/editor/Dockerfile -t koharu-editor-og:local .
docker run -d --name koharu-editor-og --restart unless-stopped --init \
  --read-only --tmpfs /tmp:size=16m,mode=1777 --memory=256m \
  -p 127.0.0.1:4323:4323 koharu-editor-og:local
```

然后把博客域名的 `/api/editor/og` 反代到该端口，示例如下。纯 CDN 托管也需要在该域名的入口配置这条路由；仅上传静态文件不会自动提供抓取能力。

### 直接使用 Node

在安装好根目录依赖的项目中，使用 Node 22.20 或更新版本：

```sh
node --import tsx scripts/editor-og.ts
```

默认监听 `127.0.0.1:4323`。可设置 `EDITOR_OG_HOST`、`EDITOR_OG_PORT`。CMS 使用 4322，两者不会争抢同一端口。`SIGINT`、`SIGTERM` 停止接受新连接并等待已有请求，九秒后关闭剩余入站连接。

这条直接运行命令需要 `tsx`；根项目中它是开发依赖，而上述独立 OG 镜像已把它列为运行依赖，无需安装整个博客。不能直接在只含静态 `dist/` 的 nginx 镜像里执行此命令。容器内监听 `EDITOR_OG_HOST=0.0.0.0`，通过内部网络或宿主回环地址反代访问。服务不需要博客源文件的写权限或任何 `.env` 凭据。

nginx 同域反代示例（保留外部 Host，以匹配浏览器 Origin）：

```nginx
location = /api/editor/og {
    proxy_pass http://127.0.0.1:4323;
    proxy_set_header Host $http_host;
    proxy_read_timeout 12s;
    access_log off;
}
```

如 nginx 与 Node 不在同一个容器或主机，将目标替换为服务内部地址。其余博客路由仍使用原有静态托管，不要求整个博客转为 Node。这里只反代指定路径，不能顺带公开 `/api/cms/`。

## 部署一个可共享的公开实例

服务不绑定博客域名、Vercel 或本站部署。可以只运行 OG 容器，用自己的 HTTPS 域名提供 `/api/editor/og`，让其它网站的编辑器填写这个实例地址。仍然不需要数据库、Redis 或账号。

独立部署示例：

```sh
docker build -f deploy/editor/Dockerfile -t koharu-editor-og:local .
docker run -d --name koharu-editor-og --restart unless-stopped --init \
  --read-only --tmpfs /tmp:size=16m,mode=1777 --memory=256m \
  -e EDITOR_OG_ALLOWED_ORIGINS='*' \
  -p 127.0.0.1:4323:4323 koharu-editor-og:local
```

在 `https://og.example.com` 的入口把 `/api/editor/og` 反代到 `127.0.0.1:4323`，可以复用上面的 nginx 配置。这里的域名是示例，需要替换为实际域名并配置 HTTPS。容器本身不处理 TLS。保持实例公开可读；Vercel 登录保护等需要登录的入口不能作为供他人调用的公共实例。

`EDITOR_OG_ALLOWED_ORIGINS` 是服务端运行时配置，Node、Docker 和 Vercel Node 函数都支持：

| 值 | 行为 |
| --- | --- |
| 未设置 | 保留默认同源访问，拒绝跨站浏览器请求 |
| `*` | 接受任意合法 HTTP(S) 网页来源的无凭据跨域访问 |
| `https://blog.example,https://other.example` | 只额外允许这些精确来源；来源含协议、主机和端口，不含路径 |

允许来源的 GET、错误响应和 GET 的 OPTIONS 预检都会带正确的 CORS 头。服务不提供带 Cookie/认证凭据的跨域模式，不开放其它 HTTP 方法、上传或文件接口。Origin 检查始终不是认证，公开模式保留相同的 URL/DNS、响应大小、超时、缓存、并发和请求预算。[浏览器 CORS 的工作方式](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)。

直接运行 Node 时：

```sh
EDITOR_OG_ALLOWED_ORIGINS='*' pnpm editor:og
```

访客在写作室「实时预览」旁的链接图标中打开「链接预览服务」，填写 `https://og.example.com` 或完整接口 `https://og.example.com/api/editor/og`，点击「使用此实例」。只填写域名时自动补标准接口；也支持返回相同 JSON 格式的自定义接口路径。设置保存到当前浏览器的 localStorage，所有草稿共用，可以「恢复默认」。切换服务立即重新渲染并抓取链接；第三方实例响应在浏览器中流式限制为 256 KiB，超限或格式错误会保留原链接。文章原文、草稿、属性和 MD 导出不包含该设置。HTTPS 页面必须使用 HTTPS 实例。

若希望博客访客默认使用这个实例，在博客构建时设置：

```sh
PUBLIC_EDITOR_OG_ENDPOINT=https://og.example.com/api/editor/og pnpm build
```

这只是默认地址，访客仍可自行更换；服务端实例还需开放对应 CORS 来源。抓取失败时保留可点击的原链接，不能通过实例设置绕过目标网站限制。服务经过单个反向代理时共享每分钟 120 次预算，公开实例流量较大时可在入口追加按客户端限流，而不需要在服务内新增存储。

## 复用接口

```ts
import { handleEditorOGRequest } from './src/features/editor/server/http';

// 既有 Node/Connect 中间件内：返回 false 表示不属于此接口，继续已有路由。
const handled = await handleEditorOGRequest(req, res);
if (!handled) next();
```

`createEditorOGHandler()` 可以创建单独的 HTTP 限流实例；`createEditorOGServer()` 创建尚未监听的原生 Node 服务器。核心 `fetchEditorOG(url): Promise<OGData>` 位于 `src/features/editor/server/og-service.ts`，不注册路由、不监听端口，也不读取或写入仓库缓存。核心仅依赖抓取与内存缓存，可由 CMS 或其他服务端适配器复用。

## 限制与隐私

- 仅接受 HTTP(S) 的 80/443 端口，不接受 URL 登录凭据、额外参数或请求正文；URL 最长 4096 字符。
- 每次跳转都校验所有 DNS 结果为公网地址，并将已验证的地址固定到实际连接；最多五次跳转。私网、回环、链路本地和保留地址被拒绝。规则取自已有 CMS 安全抓取实现。
- 请求预算八秒，异步 DNS、响应正文、元数据提取等待共用 deadline。DNS 底层系统查询不能被 Node `lookup` 主动取消，但调用方等待会及时结束。解析器的同步执行由一 MiB HTML 输入上限约束，不是可抢占的 CPU 执行环境。
- 只读取 HTML/XHTML；流式统计解压后正文，上限一 MiB。返回标题最长 300、摘要最长 1000 字符。图片和 favicon 只返回通过 URL 校验的地址，不替用户下载图片或扫描其他链接。
- 同时最多四次不同 URL 的抓取，相同 URL 合并在途请求；超过并发限制及时返回繁忙信息，不维护无限等待队列。
- 最多缓存 256 条，成功保留一小时、失败保留三十秒；不持久化、重启即清空，不暴露缓存列表。
- HTTP 层每个直连地址每分钟最多 120 次请求，限流表最多 1024 条；不信任 `X-Forwarded-For`。经过同一个反向代理的访问共享该预算，可在边缘额外按客户端限流。预算及其他默认值可在创建适配器时调整。
- 服务不记录 URL、正文或上游异常堆栈，响应设置 `no-store`。反向代理也应关闭此路径的查询日志，因为 URL 查询参数可能含敏感信息。仅 URL 离开浏览器，Markdown、frontmatter、加密密码和本机草稿不上传。
- 默认不开放跨域许可；共享实例可以显式配置公开或精确来源许可。接口仍是公开接口，Origin 检查不是认证，流量与内存边界始终生效。

## 验证

离线测试使用注入的 DNS 与 HTTP 传输，不连接公网：

```sh
node --import tsx --test src/features/editor/server/og-service.test.ts
```

测试覆盖私网地址、混合 DNS 结果、跳转至内网、跳转上限、正文大小、DNS/正文超时、缓存过期与容量、在途去重、并发限制、元数据解析、HTTP 路由边界及限流、公开/精确来源 CORS、预检与错误响应。实际反代、生产网络与目标网站成功率需要部署环境验证。


部署文件验证可运行 `docker compose -f deploy/editor/compose.yaml config --quiet`，不需要启动容器。本次还在隔离目录中仅用独立锁文件安装生产依赖，验证了 CLI 导入无启动副作用、真实元数据解析器和共享卡片 HTML；该环境不存在 Astro、BlockNote、Hono 或机器学习包。Docker 守护进程在当前验证环境不可访问，尚未实际构建或运行 Linux 镜像，也未实测容器反代。

本机代理的 fake-IP DNS 可能将公网域名解析为 `198.18.0.0/15`，该保留网段会被服务拒绝。服务需要返回真实公网地址的 DNS；可以为运行服务的环境使用正常 DNS，并在部署环境验证实际目标网站。

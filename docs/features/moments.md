# 碎碎念（Moments）

碎碎念是一个可选的动态归档页面。它在请求时从
[koharu-suite](https://github.com/cosZone/koharu-suite) 的公开读取 API 获取频道消息，同时保留
astro-koharu 现有文章的静态构建方式。功能默认关闭；未启用时不需要 suite、不读取
`KOHARU_SUITE_URL`，也不会产生碎碎念路由。

## 开启功能

先确保 koharu-suite 有一个可被浏览器和 astro-koharu Node 容器共同访问的公开 HTTPS origin。
不要在 URL 中放置管理员 token、数据库凭据或只在 Docker 内部可访问的主机名。

在 `config/site.yaml` 中启用：

```yaml
moments:
  enabled: true
  path: moments
  title: 碎碎念
  description: 记录频道中的日常消息
  ogImage: /img/moments-og.png
```

然后在 `.env` 中设置：

```env
KOHARU_SUITE_URL=https://suite.example.com
```

`path` 可以是 `moments`，也可以是 `life/moments` 这样的安全嵌套路径。开启后请使用支持
Astro Node standalone 的动态部署；默认 nginx 静态镜像不会运行这些按需路由。详见
[部署架构](../overview/11-deployment-adapters.md)。

## 频道配置

`channels` 可以完全省略。此时所有公开频道都会显示，slug 依次取 Telegram username 或完整的
Suite channel UUID。生产站建议为长期公开的频道配置稳定 slug：

```yaml
moments:
  enabled: true
  path: life/moments
  pathAliases:
    - moments
  channels:
    - id: 550e8400-e29b-41d4-a716-446655440000
      slug: daily
      title: 日常
      primary: true
      hidden: false
      ogImage: /img/daily-og.png
      aliases:
        - old-daily
```

- 配置频道按 YAML 顺序展示，未配置的新频道追加在后。
- 最多只能有一个 `primary`；未指定时使用第一个可见频道。
- `hidden` 会从碎碎念首页、频道页、搜索、RSS 和直接详情链接中隐藏频道，但不会停止 suite 采集。
- `pathAliases` 和频道 `aliases` 只为显式配置的旧地址提供 308 跳转，不会自动追踪 username 改名。
- channel ID 可从 koharu-suite Owner Desk 复制；省略 `channels` 时不需要手工填写。
- path、slug、alias 与现有路由、locale、系列或彼此冲突时，构建会直接报错。

导航中可以放置一个可调序的占位：

```yaml
navigation:
  - name: 首页
    path: /
  - feature: moments
    icon: ri:chat-smile-3-fill
  - name: 关于
    path: /about
```

功能关闭时占位不会显示；未放置占位时，启用后的入口默认插在归档之后。

## 页面与内容语义

碎碎念提供首页、频道消息流、消息详情、cursor 翻页、简单搜索，以及全局和单频道 RSS。它是单一
canonical 动态区域，不会复制为 `/en` 或 `/ja` 路由。正文和媒体来自 suite 的公开安全输出；
Telegram 仍是来源，但页面文案统一使用“查看源消息”。无法构造公开来源 URL 时不会生成假链接。

消息保持 newest-first。feed 中长正文会在有 JavaScript 且确认溢出后折叠，详情页始终展示完整
正文。`revision > 1` 只表示“已更新”，不会伪造编辑时间。feed 会把相邻且具有同一
`mediaGroupId` 的消息显示为一个相册；Telegram Desktop JSON 缺少该字段时，仅在同频道、同一
时间、来源消息 ID 连续、每条都有媒体且最多一条含正文时进行保守合并。跨 cursor 边界的候选组
保持独立，避免隐藏未加载的媒体；聚合卡片展示相册全部媒体且每项保留自己的来源链接，每条 suite
message 的 UUID 和详情永久链接仍然有效。

RSS 的 GUID 使用稳定的 suite message UUID，`pubDate` 使用该稳定成员的原始 `publishedAt`；相册使用
不随 caption 编辑变化的成员 UUID 作为 RSS GUID 锚点。聚合卡片和 RSS item 的链接则跟随实际提供正文的
成员，确保打开的详情与所见正文一致；编辑后 GUID 和 pubDate 不变，正文更新为当前 revision。

## 缓存与故障边界

默认单容器动态部署使用单进程内存缓存：普通页面与 RSS 约 300 秒，搜索约 60 秒。因此新消息或
编辑可能最多延迟五分钟出现。缓存随进程重启清空；多实例部署必须配置并验证共享缓存，不能假设
各实例内存一致。

频道或消息不存在返回 404，限流返回 429，网络、超时、上游 5xx 和非法响应返回带站点外壳的
503。失败响应不会进入正常缓存。裸 Node 部署不保证 24 小时 stale-on-error；如需要该能力，请在
经过验证的 CDN、反向代理或分布式缓存中配置。suite 短暂离线只影响碎碎念，已构建的首页和文章
仍然可用，也不会触发容器 liveness 重启。

## 本地真实链路验收

请使用从公开仓库创建的独立测试 checkout，不要使用包含私人文章的仓库：

1. 在测试 checkout 的 `config/site.yaml` 开启 moments，并配置 `.env` 的公开 suite origin。
2. 运行 `pnpm install` 和 `pnpm dev`。
3. 检查首页、频道页、详情、搜索、RSS、permalink 和“查看源消息”。
4. 在测试频道发送文字和媒体，再编辑文字；开发模式不启用 route cache，无需等待五分钟。
5. 运行 `pnpm docker:up:dynamic`，再运行 `pnpm test:moments:docker`。
6. 暂停 suite 后访问一个未缓存碎碎念 URL，应看到 503；静态首页和文章仍应为 200。
7. 恢复 suite，完成后运行 `pnpm docker:down:dynamic`。

修改 `path`、频道 override、标题、导航或 OG 等构建期配置后需要重新构建；仅新增或编辑 suite
消息不需要重新构建。

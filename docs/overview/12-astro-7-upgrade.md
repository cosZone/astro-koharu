# Astro 7 升级说明

astro-koharu 使用 Astro 7、Vite 8 和 Rolldown，同时继续以纯静态构建作为默认交付方式。
本次升级不启用 koharu-suite、Live Collections、动态路由或 Node adapter。

## 用户需要知道的变化

- Node.js 最低版本提高到 `22.20.0`，pnpm 固定为 `10.28.2`。
- `astro-pagefind` 2 使用 Pagefind Component UI；搜索入口、三语界面和键盘导航保持可用。
- Umami tracker 改由本地 Astro 组件输出，不再依赖只声明支持到 Astro 6 的第三方 integration。
- Markdown 继续显式使用 Unified processor，HTML compression 继续开启。
- `pnpm build` 的输出仍是可交给 nginx 或任意静态文件服务器的 `dist/`。

## 升级步骤

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm check
pnpm build
```

如果使用 Docker，继续运行原有命令：

```bash
pnpm docker:up
```

Bundle analysis 仍按需启用，报告会写入已忽略的 `.sonda/` 目录：

```bash
ANALYZE=true pnpm build
```

`config/site.yaml` 的内容、Umami 字段和静态部署入口不需要迁移。历史文章也没有数据迁移。

## 验证重点

- 首页、文章、Pagefind 搜索与三语路由；
- Markdown 扩展、Mermaid、Shiki 和加密内容；
- Tailwind、YAML、SVGR、自定义 Vite plugin 与 Sonda analysis mode；
- 浅色/暗色、桌面/移动布局；
- static Docker build 和 nginx health check。

## 回滚

本次升级没有数据库、内容或配置格式迁移。若上线后出现回归，revert Astro 7 升级 PR 的 squash
merge commit，并按旧 lockfile 重新执行 `pnpm install --frozen-lockfile` 和静态构建即可。

不要只降级 `astro` 而保留 Vite 8、`@astrojs/react` 6 或 `astro-pagefind` 2；这些依赖作为一组升级和回滚。

参考：[Astro 7 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v7/)。

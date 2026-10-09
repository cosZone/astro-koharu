# README 新功能概览图设计说明

本轮保留三份 README 的所有现有图片。中文 README 有四张功能卡片：写作 · 阅读 · 分享（`readme-feature-overview.zh.webp`）、写丰富的正文（`readme-feature-markdown.zh.webp`）、整理与个性化（`readme-feature-organize.zh.webp`），追番与歌单（`readme-feature-media.zh.webp`），都在 `docs/assets/`，源文件在 `docs/design/readme-feature-overview/`；英文、日文 README 仍保留不可见的注释预留位，等本地化界面截图后再补。

## 目标与风格

沿用 README 的萌系、粉蓝配色，让新读者一眼看到「写作 → 阅读 → 分享」这条路径，突出写作室、落款和 Markdown 操作。现有顶部大图继续作为品牌主图，新图作为其后的功能补充。

建议横版 1600 × 900，暖白底、淡粉和淡蓝分区、圆角卡片、轻阴影，搭配少量花瓣与手写线条。标题用圆润字体，正文保持清晰；以站点实际界面为主，装饰不要盖住功能。缩至 GitHub 正文宽度后仍能辨认三组标题。

## 构图与文案

| 位置 | 画面 | 推荐中文文案 |
| --- | --- | --- |
| 顶部 | 小号主题名、短标题、少量花瓣 | astro-koharu · 写下日常，也写下热爱 |
| 左侧约 45% | 写作室源码与预览双栏，露出语法手册入口 | 写作室：边写边预览 |
| 中间约 35% | 同一篇虚构文章的正文，带目录和文末落款 | 阅读：让长文也好读 |
| 右侧约 20% | 文章操作菜单与多语言入口局部 | 分享：带走 Markdown |
| 底部 | 三个简短说明，不堆技术栈徽章 | 浏览器草稿 · 文章落款 · 复制与下载 |

画面用同一篇虚构文章「春日散步手记」，正文可写「风吹过路边的花，今天也想记下一点小事」。落款用「手写」，阅读提示可用「含剧透」。如果展示写作室打开菜单，在演示配置中设置 `postActions.openInEditor: everyone` 并开启 `editor.enabled`，使截图与实际功能一致。

## 交付

- 交付一个文字清晰的 WebP 或 PNG，建议控制在 500 KB 内；保留可编辑源文件供后续更新。
- 新资产放入 `docs/assets/readme-feature-overview.zh.webp`，生成后再把 README 中的注释替换为有意义的 alt 文本与图片链接。不要提前引用不存在的文件。
- 更新方法：从示例站点的构建（`pnpm build` 后 `astro preview`）以 2 倍像素比重拍截图，裁切后替换 `docs/design/readme-feature-overview/shots/`，再运行 `node docs/design/readme-feature-overview/render.mjs` 导出全部卡片（需要 `cwebp`）。卡片共用 `card.css`，画布宽 1600，高度取各页面 `body` 的高度。截图前隐藏 `astro-dev-toolbar`，并避开预览站没能加载的外部图片。
- 中、英、日三份 README 使用同一构图。可分别提供本地化版本，也可提供少文字的通用版本；中文画面不能标成已本地化的英文或日文界面。
- 英文标题可用「A place for notes and everyday stories」，三栏用「Write / Read / Share」；日文可用「日々のことも、好きなことも」，三栏用「書く / 読む / 共有する」。
- 不放性能分数、用户数量或尚未实现的功能，不把浏览器草稿画成远端发布。CMS 保存如需展示，应标明「本地 CMS」。
- 只用公开示例或合成内容，不使用私人博客、真实频道、凭据或本机路径。

## 给设计 agent 的提示词

> 为 astro-koharu README 制作一张 1600 × 900 横版功能概览图，沿用现有萌系粉蓝博客风格。暖白底、淡粉淡蓝圆角卡片、轻阴影和少量花瓣。以公开示例界面呈现「写作室：边写边预览」「阅读：让长文也好读」「分享：带走 Markdown」，突出源码与预览双栏、语法手册、文章落款、复制与下载。内容统一使用虚构文章《春日散步手记》，文字简短清楚。新图补充原有品牌图，不替换旧截图，不添加性能成绩、云端发布或其他未实现能力。请输出可在 GitHub 正文宽度阅读的 WebP/PNG，并提供可编辑源文件。

## 动图

README「页面与动效」一节的动图在 `docs/assets/showcase/`，由 `docs/design/readme-showcase/` 的脚本录制：先 `pnpm build`，再运行 `node docs/design/readme-showcase/record.mjs [场景名]`。需要本机 ffmpeg 支持 `libwebp_anim`，以及 ImageMagick。录制会改写 `.cache/og-data.json`，提交前请还原。

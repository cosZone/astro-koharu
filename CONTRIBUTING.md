# 贡献指南

感谢你参与 astro-koharu。功能问题与建议可以提交到 [Issues](https://github.com/cosZone/astro-koharu/issues)，也可以在[反馈与 Roadmap](https://cos.featurebase.app/)中讨论。

## 开始开发

先按 [README](./README.md#本地启动)安装依赖。开发约定见 [AGENTS.md](./AGENTS.md)，架构说明见 [docs/overview](./docs/overview/00-overview.md)。

新改动使用独立 feature 分支，PR 以 `dev` 为 base。提交信息使用聚焦的 Conventional Commit 标题，例如 `docs: clarify writing room setup`。

## 验证与 PR

按改动范围执行相关检查：

```bash
pnpm lint:fix
pnpm check
pnpm test
pnpm knip
pnpm build
```

可以用 `package.json` 中对应的 `test:*` 命令运行受影响的测试。文档改动检查 Markdown、相对链接、锚点和命令是否与当前实现一致；无需为纯文档变更启动应用构建。

PR 说明用户可见的变化、实际运行的检查和剩余验证缺口。涉及界面的改动附桌面与手机截图或录屏；涉及配置、迁移、性能或 i18n 时说明影响。公开示例与截图使用虚构内容，不提交 `.env` 或私有博客数据。

## 构建缓存

`.cache/og-data.json` 有意提交到 Git，缓存链接嵌入抓取的 OG 元数据（标题、描述、图片等）。Vercel、Netlify 等构建可以复用缓存，减少外部请求。不要将它加入 `.gitignore`，也不要把无关缓存变化混入 PR。

`.cache/` 下其他文件（如 transformers 模型缓存）仍被忽略。链接嵌入的配置与缓存细节见[链接嵌入指南](./docs/features/link-embedding.md)。

## README 与截图

中、英、日 README 保持相同章节顺序与功能表结构，翻译采用各语言自然的表达。新增事实先核对源码与配置；详细操作放进功能指南，再从 README 链接过去。

保留现有品牌图、演示与 Star History。新功能概览图的构图、文案和交付要求见[设计说明](./docs/design/readme-visual-brief.md)。

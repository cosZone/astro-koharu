# Koharu CLI 使用指南

[返回 README](../../README.md) · [完整使用指南](../../src/content/blog/tools/astro-koharu-guide.md#koharu-cli)

先按 [README 的环境与安装说明](../../README.md#本地启动)安装依赖，再在仓库根目录运行以下命令。

博客自带交互式 CLI 工具，方便管理博客内容：

```bash
pnpm koharu              # 交互式主菜单
pnpm koharu new          # 新建内容（文章/友链）
pnpm koharu backup       # 备份博客内容和配置
pnpm koharu restore      # 从备份恢复
pnpm koharu update       # 更新主题
pnpm koharu migrate      # 一键迁移历史文章数据
pnpm koharu generate     # 生成内容资产 (LQIP, 相似度, AI 摘要)
pnpm koharu clean        # 清理旧备份
pnpm koharu list         # 查看所有备份
```

## 新建内容

快速创建博客文章和友链：

```bash
# 交互式选择创建类型
pnpm koharu new

# 或直接指定类型
pnpm koharu new post     # 新建博客文章（交互式输入标题、分类、标签等）
pnpm koharu new friend   # 新建友情链接（自动追加到 config/site.yaml）
```

**新建文章功能**：

- 默认填入拼音链接（frontmatter 的 `link`），可修改，留空则不写
- 选择已有分类
- 支持多标签
- 检查文件重复
- 自动创建 frontmatter

**新建友链功能**：

- 交互式输入友站信息
- 自动追加到配置文件
- 保留 YAML 格式和注释

## 备份与还原

更新主题前，使用 CLI 备份你的个人内容：

```bash
# 基础备份（博客文章、配置、头像、.env）
pnpm koharu backup

# 完整备份（包含所有图片和生成的资产）
pnpm koharu backup --full

# 还原最新备份
pnpm koharu restore --latest

# 预览将要还原的文件（不实际还原）
pnpm koharu restore --dry-run

# 跳过确认提示
pnpm koharu restore --latest --force

# 清理旧备份，只保留最近 5 个
pnpm koharu clean --keep 5
```

## 历史内容迁移

从使用旧 `slug` 的版本升级或还原旧备份后，需要在运行 `pnpm dev` 或 `pnpm build` 前迁移文章链接。从旧版升级时，
请先等 `pnpm koharu update` 进程完全退出，再执行：

```bash
pnpm koharu migrate --dry-run
pnpm koharu migrate

# 仅检查，需要迁移时返回非零状态（适合 CI）
pnpm koharu migrate --check

# 跳过确认提示（仍会自动备份）
pnpm koharu migrate --force
```

迁移会先自动创建基础备份，保留已有 `link`，将旧 `slug` 安全转换为 `link`，并为缺少两者的文章补充稳定链接。
脚本可重复执行；发现重复链接或无法安全处理的 frontmatter 时会停止且不修改文件。通过 Koharu CLI 还原旧备份时会自动执行同一迁移。
`pnpm dev` 和 `pnpm build` 也会先执行只读检查，在内容尚未迁移时停止并显示修复命令。

## 更新主题

使用 CLI 自动更新主题（会自动备份 → 拉取 → 合并 → 安装依赖）：

```bash
# 完整更新流程（默认会先备份）
pnpm koharu update

# 仅检查更新
pnpm koharu update --check

# 跳过备份直接更新
pnpm koharu update --skip-backup

# 跳过确认提示
pnpm koharu update --force

# 更新到指定版本（示例标签，请替换为你的目标版本）
pnpm koharu update --tag v7.7.4

# clean 模式（零冲突，强制备份，适合首次迁移或冲突较多时）
pnpm koharu update --clean

# rebase 模式（重写历史，强制备份，适合熟悉 git 的用户）
pnpm koharu update --rebase

# 预览操作（不实际执行）
pnpm koharu update --dry-run
```

> **💡 更新模式说明：**
>
> - **默认模式**：使用 `git merge --no-ff` 合并上游更新，保留 merge-base 信息。遇到用户内容（博客文章、配置等）冲突时自动保留本地版本，仅主题文件冲突需手动解决。
> - **Clean 模式** (`--clean`)：用上游最新版本替换所有主题文件，然后从备份还原用户内容，实现零冲突更新。适合首次从旧版迁移或冲突较多时使用。**注意：用户对主题文件的自定义修改不会被保留。**
> - **Rebase 模式** (`--rebase`)：将本地提交重放到上游之上，重写提交历史。适合熟悉 git 的用户。
>
> CLI 更新命令是对 git 操作的封装，熟悉 git 的用户也可以直接使用 `git merge`/`git rebase` 手动操作。

## 内容生成

```bash
# 交互式选择生成类型
pnpm koharu generate

# 或直接指定类型
pnpm koharu generate lqips        # 生成 LQIP 图片占位符
pnpm koharu generate similarities # 生成相似度向量
pnpm koharu generate summaries    # 生成 AI 摘要
pnpm koharu generate all          # 生成全部

# AI 摘要可指定模型，或忽略缓存重新生成
pnpm koharu generate summaries --model <name>
pnpm koharu generate summaries --force
```

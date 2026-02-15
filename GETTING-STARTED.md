# 快速开始

欢迎使用 astro-koharu 博客主题！本文档将帮助你在 5 分钟内启动你的博客。

## 1. 环境准备

确保你的电脑已安装：

- **Node.js** 18.0 或更高版本
- **pnpm** 包管理器

如果没有安装 pnpm，运行：

```bash
npm install -g pnpm
```

## 2. 三步启动

### 第一步：获取代码

```bash
# 方式一：克隆仓库
git clone https://github.com/cosZone/astro-koharu.git
cd astro-koharu

# 方式二：使用 GitHub 模板（推荐）
# 点击仓库页面的 "Use this template" 按钮
```

### 第二步：安装依赖

```bash
pnpm install
```

### 第三步：启动开发服务器

```bash
pnpm dev
```

打开浏览器访问 http://localhost:4321 即可看到你的博客！

## 3. 配置你的博客

### 基本信息

编辑 `config/site.yaml`：

```yaml
site:
  title: 你的博客名称              # 网站标题
  alternate: myblog               # 英文短名，用于 logo
  subtitle: 你的副标题            # 副标题
  name: 你的名字                  # 作者名
  description: 博客简介            # 一句话介绍
  author: 你的名字                # 文章作者
  url: https://your-domain.com/   # 部署后的域名
  defaultOgImage: /img/avatar.webp # 默认 Open Graph 图片
  startYear: 2024                 # 建站年份
  avatar: /img/avatar.webp        # 头像路径
  showLogo: true                  # 是否显示 logo
  keywords:                       # SEO 关键词
    - 博客
    - 技术
```

### 替换头像

将你的头像图片替换到 `public/img/avatar.webp`

### 社交链接

在 `config/site.yaml` 中配置社交媒体链接：

```yaml
social:
  github:
    url: https://github.com/your-username
    icon: ri:github-fill
    color: '#191717'
  email:
    url: mailto:your@email.com
    icon: ri:mail-line
    color: '#55acd5'
  rss:
    url: /rss.xml
    icon: ri:rss-line
    color: '#ff6600'
  # 添加更多社交链接...
```

## 4. 写第一篇文章

在 `src/content/blog/` 目录下创建 Markdown 文件。

### 基础模板

```markdown
---
title: 我的第一篇文章
date: 2024-01-01 12:00:00
tags:
  - 标签1
  - 标签2
categories:
  - 分类名
cover: /img/cover/1.webp
---

文章正文内容...
```

### Frontmatter 字段说明

| 字段          | 必填 | 说明                            |
| ------------- | ---- | ------------------------------- |
| `title`       | ✅   | 文章标题                        |
| `date`        | ✅   | 发布日期                        |
| `tags`        | ❌   | 标签列表                        |
| `categories`  | ❌   | 分类，支持嵌套如 `[笔记, 前端]` |
| `cover`       | ❌   | 封面图片路径                    |
| `description` | ❌   | 文章摘要                        |
| `sticky`      | ❌   | 设为 `true` 置顶文章            |
| `draft`       | ❌   | 设为 `true` 标记为草稿          |

### 分类使用

单层分类：

```yaml
categories:
  - 随笔
```

嵌套分类：

```yaml
categories:
  - [笔记, 前端]
```

## 5. 部署上线

### Vercel 一键部署（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cosZone/astro-koharu&project-name=astro-koharu&repository-name=astro-koharu)

1. 点击上方按钮
2. 登录 GitHub 账号
3. 等待自动部署完成

### 自定义域名

1. 在 Vercel 项目设置中添加域名
2. 按照提示配置 DNS
3. 更新 `config/site.yaml` 中的 `site.url` 字段

### Docker 部署

如果你更喜欢使用 Docker 部署：

```bash
# 1. 复制环境变量文件并填写配置
cp .env.example .env

# 2. 构建并启动（从仓库根目录运行）
docker compose --env-file ./.env -f docker/docker-compose.yml up -d --build

# 3. 访问博客
open http://localhost:4321
```

**重要**: 生成脚本需要在本地运行：

```bash
# 添加新图片/文章后，先本地运行：
pnpm koharu generate all

# 然后提交更改
git add src/assets/*.json
git commit -m "chore: update generated assets"

# 最后重建 Docker
./docker/rebuild.sh
```

详细说明请参考[使用指南的 Docker 部署章节](./src/content/blog/tools/astro-koharu-guide.md)。

## 6. 进阶功能

### 周刊/系列文章

在 `config/site.yaml` 中配置 `featuredSeries`：

```yaml
featuredSeries:
  categoryName: 周刊
  label: 我的周刊
  fullName: 我的技术周刊
  description: 每周技术分享
  cover: /img/weekly_header.webp
  enabled: true
  links:
    github: https://github.com/your-username/your-repo
    rss: /rss.xml
```

然后在 `src/content/blog/` 目录创建周刊文章。

### 多语言支持（i18n）

博客内置多语言支持。在 `config/site.yaml` 中配置：

```yaml
i18n:
  defaultLocale: zh        # 默认语言（URL 无前缀）
  locales:
    - code: zh
      label: 中文
    - code: en
      label: English
```

配置后，博客会自动生成带语言前缀的页面（如 `/en/post/xxx`），导航栏和移动端抽屉中会出现语言切换器。

**添加翻译文章**：将翻译文章放在 `src/content/blog/<locale>/` 目录下，保持与默认语言相同的路径结构：

```plain
src/content/blog/
├── tools/getting-started.md        # 默认语言 (zh)
└── en/tools/getting-started.md     # 英文翻译
```

没有对应翻译的文章会自动回退显示默认语言内容，并标注提示。

更多详细配置（内容翻译、添加新语言等）请参考 [README 的多语言配置章节](./README.md#多语言配置i18n)。

### 内容生成（可选）

使用 Koharu CLI 生成内容资产：

```bash
# 交互式选择生成类型
pnpm koharu generate

# 或直接指定类型
pnpm koharu generate lqips        # 生成 LQIP 图片占位符，提升加载体验
pnpm koharu generate similarities # 生成语义相似度向量，推荐相关文章
pnpm koharu generate summaries    # 生成 AI 摘要
pnpm koharu generate all          # 生成全部
```

## 常用命令

| 命令                        | 说明                               |
| --------------------------- | ---------------------------------- |
| `pnpm dev`                  | 启动开发服务器                     |
| `pnpm build`                | 构建生产版本                       |
| `pnpm preview`              | 预览生产构建                       |
| `pnpm lint`                 | 代码检查                           |
| `pnpm koharu`               | 交互式 CLI 菜单                    |
| `pnpm koharu backup`        | 备份博客内容（--full 完整备份）    |
| `pnpm koharu restore`       | 从备份恢复（--latest 还原最新）    |
| `pnpm koharu update`        | 更新主题（--check, --clean, --rebase 等）|
| `pnpm koharu generate`      | 生成内容资产                       |
| `pnpm koharu clean`         | 清理旧备份（--keep N 保留 N 个）   |
| `pnpm koharu list`          | 查看所有备份                       |

## 7. 更新主题

当主题发布新版本时，你可以按以下步骤更新，同时保留你的个人内容。

### 使用 CLI 更新（推荐）

使用 Koharu CLI 一键更新主题，自动完成备份 → 拉取 → 合并 → 安装依赖的全流程：

```bash
# 完整更新流程（默认会先备份）
pnpm koharu update

# 仅检查是否有更新
pnpm koharu update --check

# 跳过备份直接更新
pnpm koharu update --skip-backup

# clean 模式（零冲突，适合首次迁移或冲突较多时）
pnpm koharu update --clean

# rebase 模式（重写历史，适合熟悉 git 的用户）
pnpm koharu update --rebase

# 预览操作（不实际执行）
pnpm koharu update --dry-run

# 更新到指定版本
pnpm koharu update --tag v2.1.0
```

**三种更新模式：**

| 模式 | 命令 | 适合场景 | 备份 |
|------|------|---------|------|
| **默认** | `pnpm koharu update` | 日常更新 | 可选 |
| **Clean** | `pnpm koharu update --clean` | 首次迁移、冲突较多 | 强制 |
| **Rebase** | `pnpm koharu update --rebase` | 熟悉 git 的用户 | 强制 |

- **默认模式**：使用 `git merge` 合并上游更新。用户内容（博客文章、配置等）冲突会自动保留本地版本，仅主题文件冲突需手动解决。
- **Clean 模式**：用上游最新版本替换所有主题文件，再从备份还原你的用户内容，实现零冲突。**注意：你对主题文件的自定义修改不会被保留。**
- **Rebase 模式**：将你的本地提交重放到上游之上，重写提交历史。适合对 git 有一定了解的用户。

> **💡 给熟悉 git 的用户：** CLI 更新命令是对 git 操作的封装便利工具。如果你对 git 比较熟悉，完全可以直接使用 `git fetch upstream && git rebase upstream/main`（或 `git merge`）手动操作，这样能更精确地控制合并过程。

更新过程中会自动：
1. 检查工作区状态
2. 备份你的个人内容（可选，clean/rebase 模式强制备份）
3. 设置 upstream remote（如果没有）
4. 获取最新代码
5. 显示新提交列表和更新日志
6. 合并更新（根据所选模式）
7. 安装依赖

如果遇到合并冲突，CLI 会显示冲突文件列表并提供解决指引。用户内容的冲突会被自动解决（保留本地版本）。

### 手动更新

如果你更喜欢手动操作：

```bash
# 1. 先备份你的个人内容
pnpm koharu backup --full

# 2. 添加上游仓库（只需执行一次）
git remote add upstream https://github.com/cosZone/astro-koharu.git

# 3. 获取最新代码
git fetch upstream

# 4. 合并更新到你的分支
git merge upstream/main

# 5. 解决可能的冲突，然后安装依赖
pnpm install

# 6. 测试是否正常
pnpm dev
```

### 还原备份

如果更新后需要还原备份：

```bash
# 查看所有备份
pnpm koharu list

# 预览将要还原的文件
pnpm koharu restore --dry-run

# 还原最新备份
pnpm koharu restore --latest
```

### 更新后检查

更新完成后，建议检查以下内容：

1. **配置兼容性**：如果 `config/site.yaml` 有新增字段，参考 `.env.example` 或文档补充
2. **依赖更新**：运行 `pnpm install` 确保依赖正确安装
3. **构建测试**：运行 `pnpm build` 确保构建成功
4. **功能测试**：运行 `pnpm dev` 检查页面是否正常显示

### 注意事项

- 如果你修改了主题的源代码（如组件样式），合并时可能会产生冲突，需要手动解决
- 建议在更新前使用 `git stash` 或创建分支保存本地修改
- 重大版本更新请查看 [Release Notes](https://github.com/cosZone/astro-koharu/releases) 了解破坏性变更

## 获取帮助

- 📖 [详细使用指南](./src/content/blog/tools/astro-koharu-guide.md)
- 🐛 [提交 Issue](https://github.com/cosZone/astro-koharu/issues)
- ⭐ [GitHub 仓库](https://github.com/cosZone/astro-koharu)

---

祝你搭建愉快！

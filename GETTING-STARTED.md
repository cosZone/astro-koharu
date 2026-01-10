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
3. 更新 `site-config.ts` 中的 `site` 字段

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
pnpm generate:all

# 然后提交更改
git add src/assets/*.json
git commit -m "chore: update generated assets"

# 最后重建 Docker
./docker/rebuild.sh
```

详细说明请参考[使用指南的 Docker 部署章节](./src/content/blog/tools/astro-koharu-使用指南.md)。

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

### AI 摘要（可选）

```bash
pnpm generate:summaries
```

自动为文章生成 AI 摘要。

### 图片优化（可选）

```bash
pnpm generate:lqips
```

生成图片占位符，提升加载体验。

### 相关文章推荐（可选）

```bash
pnpm generate:similarities
```

基于语义相似度推荐相关文章。

## 常用命令

| 命令           | 说明           |
| -------------- | -------------- |
| `pnpm dev`     | 启动开发服务器 |
| `pnpm build`   | 构建生产版本   |
| `pnpm preview` | 预览生产构建   |
| `pnpm lint`    | 代码检查       |

## 7. 更新主题

当主题发布新版本时，你可以按以下步骤更新，同时保留你的个人内容。

### 需要备份的文件

更新前，请备份以下个人文件：

| 文件/目录 | 说明 |
| --- | --- |
| `src/content/blog/` | 你的所有博客文章 |
| `config/site.yaml` | 站点配置（标题、社交链接、导航等） |
| `src/pages/about.md` | 关于页面 |
| `public/img/avatar.webp` | 你的头像 |
| `.env` | 环境变量（Umami、Remark42 等配置） |
| `public/img/` 中的自定义图片 | 如果你添加了自己的封面图或其他图片 |

### 更新步骤

#### 方式一：使用 Git 合并（推荐）

如果你是通过 fork 或 `git clone` 获取的代码：

```bash
# 1. 添加上游仓库（只需执行一次）
git remote add upstream https://github.com/cosZone/astro-koharu.git

# 2. 获取最新代码
git fetch upstream

# 3. 合并更新到你的分支
git merge upstream/main

# 4. 解决可能的冲突，然后安装依赖
pnpm install

# 5. 测试是否正常
pnpm dev
```

#### 方式二：手动更新

如果你不熟悉 Git 操作：

```bash
# 1. 备份你的个人文件
cp -r src/content/blog/ ~/backup/blog/
cp config/site.yaml ~/backup/
cp src/pages/about.md ~/backup/
cp public/img/avatar.webp ~/backup/
cp .env ~/backup/

# 2. 下载最新版本的主题
# 从 https://github.com/cosZone/astro-koharu/releases 下载

# 3. 解压并覆盖项目文件

# 4. 恢复你的个人文件
cp -r ~/backup/blog/ src/content/blog/
cp ~/backup/site.yaml config/
cp ~/backup/about.md src/pages/
cp ~/backup/avatar.webp public/img/
cp ~/backup/.env ./

# 5. 安装依赖并测试
pnpm install
pnpm dev
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

- 📖 [详细使用指南](./src/content/blog/tools/astro-koharu-使用指南.md)
- 🐛 [提交 Issue](https://github.com/cosZone/astro-koharu/issues)
- ⭐ [GitHub 仓库](https://github.com/cosZone/astro-koharu)

---

祝你搭建愉快！

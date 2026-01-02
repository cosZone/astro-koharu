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

编辑 `src/constants/site-config.ts`：

```typescript
export const siteConfig = {
  title: "你的博客名称", // 网站标题
  alternate: "myblog", // 英文短名，用于 logo
  subtitle: "你的副标题", // 副标题
  name: "你的名字", // 作者名
  description: "博客简介", // 一句话介绍
  author: "你的名字", // 文章作者
  site: "https://your-domain.com/", // 部署后的域名
  startYear: 2024, // 建站年份
};
```

### 替换头像

将你的头像图片替换到 `public/img/avatar.webp`

### 社交链接

在同一文件中配置社交媒体、站点设置等元信息：

```typescript
export const socialConfig = {
  github: {
    url: "https://github.com/your-username",
    icon: "ri:github-fill",
    color: "#191717",
  },
  email: {
    url: "mailto:your@email.com",
    icon: "ri:mail-line",
    color: "#55acd5",
  },
  // 添加更多社交链接...
};
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

## 6. 进阶功能

### 周刊/系列文章

在 `site-config.ts` 中配置 `featuredSeries`，然后在 `weekly/` 目录创建周刊文章。

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

## 获取帮助

- 📖 [详细使用指南](./src/content/blog/tools/astro-koharu-使用指南.md)
- 🐛 [提交 Issue](https://github.com/cosZone/astro-koharu/issues)
- ⭐ [GitHub 仓库](https://github.com/cosZone/astro-koharu)

---

祝你搭建愉快！

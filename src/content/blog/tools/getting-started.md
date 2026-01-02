---
title: 欢迎使用 astro-koharu
link: getting-started
catalog: true
date: 2024-01-01 00:00:00
description: 欢迎使用 astro-koharu 博客主题！这是一个基于 Astro 的现代化博客系统，拥有优雅的界面和丰富的功能。
tags:
  - 入门
  - Astro
categories:
  - 工具
sticky: true
---

欢迎使用 astro-koharu 博客主题！

## 关于这个主题

astro-koharu 是一个基于 Astro 5.x 构建的现代化博客系统，设计灵感来自 Hexo 的 Shoka 主题。它具有以下特点：

- **性能优异** - 基于 Astro 静态站点生成，加载速度快
- **优雅设计** - 萌系/二次元风格，粉蓝配色
- **功能丰富** - 多级分类、标签、目录、搜索等
- **响应式** - 完美适配桌面和移动设备

## 快速开始

### 1. 配置你的博客

编辑 `src/constants/site-config.ts` 文件：

```typescript
export const siteConfig = {
  title: "你的博客名称",
  author: "你的名字",
  description: "你的博客简介",
  // ...更多配置
};
```

### 2. 写第一篇文章

在 `src/content/blog/` 目录下创建 Markdown 文件：

```markdown
---
title: 我的第一篇文章
date: 2024-01-01
tags:
  - 标签1
categories:
  - 分类名
---

文章内容...
```

### 3. 部署上线

推荐使用 Vercel 一键部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cosZone/astro-koharu)

## 了解更多

- 查看 [Markdown 功能演示](/post/markdown-features) 了解所有 Markdown 增强功能
- 查看 [使用指南](/post/astro-koharu-guide) 了解详细配置说明

祝你使用愉快！

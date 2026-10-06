---
title: 示例周刊 Vol.3 | 写作环境
link: weekly-example-3
catalog: true
date: 2025-07-04 21:00:00
description: 第三期示例周刊：整理一套写博客时的本地环境，从编辑器、预览到发布前检查，也是系列导航里「最新一期」的演示。
cover: /img/cover/9.webp
excludeFromSummary: true
tags:
  - 周刊
  - 写作
categories:
  - 周刊
---

距离上一期隔了好几个月。周刊不一定要准时，能接着写下去就好。

这一期聊写作环境。

## 一篇文章的路径

```infographic
infographic sequence-zigzag-steps-underline-text
data
  title 从草稿到上线
  items
    - label 起草
      desc 在编辑器或写作室里写下初稿
    - label 预览
      desc 本地开发服务器实时查看排版
    - label 检查
      desc 跑一遍 lint 和类型检查
    - label 发布
      desc 推送后由 CI 构建部署
```

## 本期工具

### 本地预览

写长文时我习惯开着开发服务器，左边编辑器，右边浏览器：

```bash command:("$":1)
pnpm dev
```

保存文件后页面会自动刷新。改了 `config/site.yaml` 的话需要重启服务器，配置在构建时会被缓存。

### 草稿

还没写完的文章在 frontmatter 里加上 `draft: true`，生产构建时会被排除，开发环境仍然可见。

### 新建文章

不想手写 frontmatter 的话，可以用 CLI 交互式创建：

```bash command:("$":1)
pnpm koharu new post
```

## 读到的东西

- [Astro 文档：内容集合](https://docs.astro.build/zh-cn/guides/content-collections/)：写自定义 frontmatter 字段之前值得读一遍。
- [MDN：`<details>` 元素](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/details)：主题里的折叠块就是类似的交互。

## 一句话

> 先写完，再写好。

这是目前的最新一期。翻到页面底部，可以看到它和前两期之间的上一期导航。

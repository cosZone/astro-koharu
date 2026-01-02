---
title: 关闭目录编号示例
link: toc-no-numbering
catalog: true
tocNumbering: false
date: 2024-01-07 00:00:00
description: 展示如何关闭文章目录的自动编号功能。
tags:
  - 目录
  - 教程
categories:
  - 笔记
---

本文展示如何关闭目录的自动编号功能。

## 目录编号功能

默认情况下，astro-koharu 会使用 CSS 计数器为目录自动添加层级编号，如：

- 1. 第一章
  - 1.1. 第一节
  - 1.2. 第二节
- 2. 第二章

## 关闭编号

通过设置 `tocNumbering: false` 可以关闭特定文章的编号：

```yaml
---
title: 我的文章
tocNumbering: false
---
```

## 效果对比

### 开启编号（默认）

目录项会显示 1., 1.1., 1.1.1. 这样的编号。

### 关闭编号

目录项只显示标题文本，没有编号前缀。

## 本文效果

本文已设置 `tocNumbering: false`，你可以查看右侧目录（桌面端）或展开目录（移动端）来查看效果。

## 技术实现

编号功能通过纯 CSS 计数器实现，零运行时开销：

```css
.toc-numbering {
  counter-reset: h2;
}

.toc-numbering h2::before {
  counter-increment: h2;
  content: counter(h2) ". ";
}
```

## 使用建议

以下场景可能需要关闭编号：

- 随笔类文章
- 标题本身已有编号
- 内容结构较松散的文章
- 个人偏好

## 总结

目录编号是一个可选功能，根据文章类型灵活使用即可。

---
title: 自定义关键词示例
link: custom-keywords
date: 2026-04-05 18:43:11
description: 展示如何设置文章关键词。
tags:
  - 教程
categories:
  - 笔记
keywords:
  - 示例关键词一
  - 示例关键词二
---

本文展示如何设置文章关键词。

## frontmatter 关键词设置

在文章的 frontmatter 中添加 keywords 字段即可设置关键词：

```markdown
---
title: 我的文章
date: 2026-01-01
keywords:
  - 示例关键词一
  - 示例关键词二
---

这是篇带有关键词的文章。
```

然后生成的页面会包含以下 meta 标签：

```html
<meta name="keywords" content="示例关键词一, 示例关键词二, ... site.keywords">
```

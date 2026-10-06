---
title: 在公开文章里藏一小段：局部加密块的用法
link: partial-encryption
catalog: true
date: 2025-11-09 19:40:00
description: 整篇加密太重，有时只想藏起一段资源链接或私人备注。这篇演示 :::encrypted 局部加密块，以及它和提醒块、标签、折叠块的搭配。
cover: /img/cover/10.webp
tags:
  - 加密
  - Markdown
  - 教程
categories:
  - 工具
excludeFromSummary: true
---

主题支持两种加密：在 frontmatter 里写 `password` 加密整篇文章，或者用 `:::encrypted` 只加密其中一段。这篇只讲后者。

[本文示例密码：koharu]{.label .primary}

## 什么时候用局部加密

:::primary
文章大部分内容可以公开，只有一小段不希望被搜索引擎收录，比如网盘链接、给朋友的留言、还在保密期的计划。
:::

如果整篇都不想公开，用整篇加密更合适，可以参考站内的「加密文章演示」。

## 写法

````markdown
:::encrypted{password="koharu"}
这里是只给知道密码的人看的内容。
:::
````

渲染出来是这样的，输入 `koharu` 试试：

:::encrypted{password="koharu"}
你好，这段内容在构建时用 AES-256-GCM 加密过，HTML 里只有密文。

加密块里依然可以使用各种语法：

- [x] 任务列表
- [ ] 还没做完的事

```bash command:("$":1)
echo "代码块也会正常高亮"
```

| 语法 | 是否支持 |
| --- | --- |
| 表格 | 支持 |
| 公式 $a^2 + b^2 = c^2$ | 支持 |
:::

## 多个加密块

一篇文章里可以有多个加密块，每个块的密码相互独立：

:::encrypted{password="spring"}
这一段的密码是 spring。实际使用时，不要把密码写在同一篇文章里。
:::

## 需要注意的地方

:::warning
前端加密的目的是防止明文被直接收录，而不是对抗有针对性的破解。密码强度决定了这段内容到底有多安全。
:::

:::danger
密码会出现在 Markdown 源文件里。如果你的博客仓库是公开的，加密块对仓库访客没有任何作用。
:::

+++info 加密块会影响哪些功能？
- **站内搜索**：页面里只有密文，加密内容不会进入搜索索引
- **AI 摘要与相关文章**：这两个脚本读取的是 Markdown 源文件，加密块的明文会被读到。所以本文在 frontmatter 里设置了 `excludeFromSummary: true`
- **复制 Markdown**：含局部加密块的文章不提供原文，「复制 Markdown」「下载」和「在写作室打开」都不会出现，避免明文和密码随源文件一起公开
+++

## 顺便：标签的几种颜色

[默认]{.label .default} [主要]{.label .primary} [信息]{.label .info} [成功]{.label .success} [警告]{.label .warning} [危险]{.label .danger}

写教程时，我常用标签标出「示例密码」这类需要读者留意的信息，比放在正文里更醒目。

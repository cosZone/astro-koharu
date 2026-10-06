---
title: 示例周刊 Vol.2 | 把手边的工具用顺
link: weekly-example-2
catalog: true
date: 2025-03-14 20:30:00
description: 第二期示例周刊：聊聊静态搜索、代码格式化和博客备份这些不起眼但天天在用的东西，顺便演示系列文章的上一期、下一期导航。
cover: /img/cover/6.webp
excludeFromSummary: true
tags:
  - 周刊
  - 工具
categories:
  - 周刊
---

这一期没有大新闻，主要聊几样每天都在用、但很少专门写的工具。顺带一提，从这一期开始，系列页面会把每期标题里 `Vol.N` 之后的部分当作本期标题，所以标题写成「示例周刊 Vol.2 | 把手边的工具用顺」这样就行。

## 本期推荐

### 本博客主题

先放一张链接卡片。链接单独占一段时，构建阶段会去抓取页面的 Open Graph 信息，渲染成卡片：

https://github.com/cosZone/astro-koharu

抓取结果会写进 `.cache/og-data.json`，下次构建直接读缓存；抓取失败也不会让构建失败，只是退回成普通链接。

### 在 React 里嵌入推文

https://github.com/vercel/react-tweet

主题的推文嵌入就是基于这个库做的。如果你的文章里经常引用推文，可以在 `config/site.yaml` 的 `content.enableTweetEmbed` 里开关。

## 工具

### 静态搜索

[Pagefind](https://pagefind.app/) 在构建后扫描生成的 HTML，产出分片的索引文件。访客搜索时只下载需要的那几片，不需要任何服务端。对于几百篇文章的博客来说，这个方案几乎没有维护成本。

### 格式化与检查

仓库用 [Biome](https://biomejs.dev/) 同时负责格式化和 lint。提交前跑一次：

```bash command:("$":1)
pnpm lint:fix
```

### 备份

升级主题前先备份一下内容和配置：

```bash command:("$":1-2)
pnpm koharu backup
pnpm koharu list
```

## 一句话

> 工具顺手的标志是你忘了它的存在。

下一期聊聊写作环境本身。

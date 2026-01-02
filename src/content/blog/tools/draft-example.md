---
title: 这是一篇草稿
link: draft-example
catalog: true
date: 2024-01-06 00:00:00
description: 这是一篇草稿示例，只有在开发环境才能看到。
tags:
  - 草稿
  - 示例
categories:
  - 工具
draft: true
---

这是一篇草稿文章！

## 草稿功能说明

设置 `draft: true` 可以将文章标记为草稿：

```yaml
---
title: 我的草稿
draft: true
---
```

## 草稿行为

### 开发环境 (`pnpm dev`)

- ✅ 草稿可见
- ✅ 文章卡片右上角显示 "DRAFT" 标识
- ✅ 可以正常预览和调试

### 生产构建 (`pnpm build`)

- ❌ 草稿会被自动过滤
- ❌ 不会出现在任何文章列表中
- ❌ 不会被搜索索引

## 使用场景

- 正在撰写的长文
- 需要反复修改的内容
- 暂时不想发布的文章
- 测试和调试用途

## 提示

如果你能看到这篇文章，说明你正在开发环境中。

发布时记得将 `draft: true` 改为 `draft: false` 或直接删除该字段。

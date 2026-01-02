---
title: 示例周刊 Vol.1
link: weekly-example-1
catalog: true
date: 2024-01-04 00:00:00
description: 这是一期示例周刊，展示周刊功能的使用方式。周刊适合发布定期更新的系列内容。
tags:
  - 周刊
categories:
  - 周刊
---

这是一期示例周刊，展示周刊/系列文章功能的使用方式。

## 关于周刊功能

周刊是 astro-koharu 的特色功能之一，适合发布定期更新的系列内容，如：

- 技术周刊
- 读书笔记系列
- 学习记录
- 项目进度更新

## 周刊配置

在 `src/constants/site-config.ts` 中配置：

```typescript
featuredSeries: {
  categoryName: '周刊',  // 分类名称
  label: '我的周刊',      // 显示标签
  fullName: '我的技术周刊',
  description: '周刊描述...',
  cover: '/img/weekly_header.webp',
  enabled: true,         // 设为 false 可关闭
}
```

## 周刊特点

1. **专属页面** - 周刊有独立的 `/weekly` 页面
2. **首页展示** - 最新一期会在首页置顶展示
3. **独立列表** - 周刊不会出现在普通文章列表中
4. **系列导航** - 周刊之间有上下篇导航

## 本期内容示例

### 推荐阅读

- [Astro 5.0 新特性介绍](https://astro.build)
- [Tailwind CSS 4.0 发布](https://tailwindcss.com)

### 工具推荐

| 工具   | 用途     | 链接       |
| ------ | -------- | ---------- |
| Biome  | 代码检查 | biome.dev  |
| Motion | 动画库   | motion.dev |

### 本周学习

这周学习了以下内容：

- [x] Astro 内容集合
- [x] Tailwind 主题配置
- [ ] Motion 动画进阶

## 下期预告

下期将介绍更多进阶功能，敬请期待！

---

感谢阅读本期周刊！

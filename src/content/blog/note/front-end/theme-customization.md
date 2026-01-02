---
title: 主题定制指南
link: theme-customization
catalog: true
date: 2024-01-03 00:00:00
description: 介绍如何定制 astro-koharu 的外观，包括配色、布局和动画效果。
tags:
  - 定制
  - CSS
  - Tailwind
categories:
  - [笔记, 前端]
cover: /img/cover/3.webp
---

本文介绍如何定制 astro-koharu 的外观和样式。

## 嵌套分类说明

本文使用了嵌套分类 `[笔记, 前端]`，这会创建层级关系：

- URL: `/categories/note/front-end`
- 面包屑: 笔记 → 前端

在 frontmatter 中这样配置：

```yaml
categories:
  - [笔记, 前端]
```

## 配色定制

### CSS 变量

主题颜色通过 CSS 变量定义，位于 `src/styles/index.css`：

```css
:root {
  --primary-color: #ff6b9d;
  --secondary-color: #7dd3fc;
  /* ...更多变量 */
}

.dark {
  --primary-color: #f472b6;
  --secondary-color: #38bdf8;
}
```

### Tailwind 配置

编辑 `tailwind.config.ts` 自定义主题：

```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color)',
        secondary: 'var(--secondary-color)',
      },
    },
  },
};
```

## 布局调整

### 内容宽度

在 `src/constants/layout.ts` 中调整布局常量：

```typescript
export const LAYOUT = {
  maxWidth: '1200px',
  sidebarWidth: '300px',
  contentPadding: '1.5rem',
};
```

### 响应式断点

主题使用 Tailwind 的默认断点：

| 断点 | 宽度 | 用途 |
|------|------|------|
| sm | 640px | 小型手机 |
| md | 768px | 平板 |
| lg | 1024px | 桌面 |
| xl | 1280px | 大屏幕 |

## 动画效果

### Motion 配置

动画使用 Motion 库，配置位于 `src/constants/anim/`：

```typescript
// spring.ts - 弹簧动画
export const springConfig = {
  stiffness: 100,
  damping: 10,
};

// variants.ts - 动画变体
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
```

### 禁用动画

对于偏好减少动画的用户，主题会自动响应 `prefers-reduced-motion` 媒体查询。

## 圣诞特效

主题内置可选的圣诞特效，在 `site-config.ts` 中配置：

```typescript
export const christmasConfig = {
  enabled: false,  // 设为 true 启用
  features: {
    snowfall: true,        // 雪花飘落
    christmasColorScheme: true,  // 圣诞配色
    christmasHat: true,    // 圣诞帽
  },
};
```

## 总结

通过修改以上配置，你可以轻松打造属于自己风格的博客。如有问题，欢迎在 GitHub 提 Issue。

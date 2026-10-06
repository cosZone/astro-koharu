---
title: Tailwind CSS v4 升级笔记
link: tailwind-v4-upgrade-notes
catalog: true
date: 2025-02-16 21:20:00
updated: 2025-03-02 09:45:00
description: v4.0 发布不久后把一个小项目从 v3 升到 v4 的记录：CSS 优先的配置、自动内容检测、几处工具类改名，以及升级工具没覆盖到的地方。
cover: /img/cover/15.webp
tags:
  - Tailwind
  - CSS
  - 迁移
categories:
  - [笔记, 前端, CSS]
colophon:
  - handwritten
  - { id: outdated, note: 写于 v4.0 发布初期，后续小版本可能已有变化 }
---

Tailwind CSS v4.0 正式发布后，我把一个小项目从 v3 升了上去。整体比预想顺利，但有几处改动不看文档很难发现，记在这里。

:::info
这篇写于 v4.0 发布后不久。后续版本的细节可能有调整，以[官方升级指南](https://tailwindcss.com/docs/upgrade-guide)为准。
:::

## 先跑官方升级工具

官方提供了一个自动迁移工具，会改依赖、改配置、改模板里的类名：

```bash command:("$":1)
npx @tailwindcss/upgrade
```

建议在干净的 Git 工作区里跑，改完用 diff 逐个看一遍。下面几节是我看 diff 时记下的。

## 配置搬进 CSS

### 入口文件

v3 的三条指令变成了一行导入：

```css title="global.css"
/* v3 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* v4 */
@import "tailwindcss";
```

### 主题变量

自定义颜色、字体不再写在 `tailwind.config.js` 里，而是用 `@theme` 声明 CSS 变量：

```css title="global.css" mark:3-4
@import "tailwindcss";

@theme {
  --color-sakura: oklch(0.82 0.08 0);
  --font-display: "Noto Serif SC", serif;
}
```

声明之后，`bg-sakura`、`font-display` 这些类就能直接用，同时 `var(--color-sakura)` 也可以在任何地方引用。

### 暂时保留旧配置

如果一时迁不完，可以用 `@config` 继续加载 JS 配置文件：

```css
@config "../../tailwind.config.mjs";
```

## 构建集成

用 Vite 的项目改用官方插件，比走 PostCSS 简单：

```js title="vite.config.js" mark:2,5
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
});
```

另外 v4 会自动检测模板文件，不再需要 `content` 数组。如果有文件在默认扫描范围之外，用 `@source` 补上。

## 改了名字的工具类

升级工具大部分能自动改，但我还是在几个动态拼接的类名上漏了：

| v3 | v4 |
| --- | --- |
| `shadow-sm` | `shadow-xs` |
| `shadow` | `shadow-sm` |
| `rounded-sm` | `rounded-xs` |
| `rounded` | `rounded-sm` |
| `outline-none` | `outline-hidden` |

还有两处默认值的变化：`ring` 的默认宽度从 3px 变成了 1px，`border` 的默认颜色变成了 `currentColor`。页面上突然多出来的深色边框，基本都是后者导致的。

## 小结

升级本身花了一个晚上，大部分时间在逐页对比样式。如果你的项目也有用字符串拼接出来的类名，记得手动搜一遍。

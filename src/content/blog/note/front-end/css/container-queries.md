---
title: 容器查询实战：让卡片自己决定布局
link: container-queries
catalog: true
date: 2026-06-08 22:15:00
updated: 2026-06-21 10:30:00
description: 同一张文章卡片放在主栏和侧栏里，应该长得不一样。用容器查询代替媒体查询，让组件根据自己的宽度切换布局，并记录几个容易踩的坑。
cover: /img/cover/12.webp
tags:
  - CSS
  - 容器查询
  - 响应式
  - Tailwind
categories:
  - [笔记, 前端, CSS]
keywords:
  - container queries
  - CSS 容器查询
  - cqi
colophon:
  - ai-cowrite
  - { icon: 'fa6-solid:mug-hot', label: 两杯咖啡, description: 写这篇的时候喝掉了两杯咖啡。 }
---

做博客首页时遇到一个很常见的问题：同一张文章卡片，放在主栏里宽，放在侧栏里窄。用媒体查询只能根据视口宽度判断，可卡片关心的其实是「我自己有多宽」。

容器查询（container queries）解决的正是这个问题。这篇记录我把一张卡片从媒体查询改成容器查询的过程。

## 问题：视口宽度不等于组件宽度

### 媒体查询的写法

最初的卡片是这样写的：

```css title="card.css" mark:1
@media (min-width: 768px) {
  .post-card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}
```

在主栏里没问题。但把同一张卡片放进 280px 宽的侧栏后，只要视口超过 768px，它依然会切成左右两栏，封面被挤成一条。

### 为什么不给侧栏单独写一套

最直接的办法是加一个修饰类，比如 `.post-card--compact`。这能用，但意味着每个使用卡片的地方都要知道卡片的内部布局。放进新的位置，就得再加一个变体。组件应该自己处理这件事。

## 基本用法

### 声明容器

先在卡片的**父元素**上声明它是一个容器：

```css title="card.css" mark:2-3
.post-card-wrapper {
  container-type: inline-size;
  container-name: card;
}
```

也可以用简写：

```css
.post-card-wrapper {
  container: card / inline-size;
}
```

#### container-type 的取值

| 取值 | 含义 |
| --- | --- |
| `inline-size` | 只按行内方向（横排文字时就是宽度）查询，最常用 |
| `size` | 同时按宽高查询，要求元素有确定的高度 |
| `normal` | 默认值，不作为尺寸容器 |

:::warning
`container-type: size` 会让元素的高度不再由内容撑开，大多数情况下你需要的是 `inline-size`。
:::

### 编写查询

然后把原来的媒体查询换成容器查询：

```css title="card.css" mark:1
@container card (min-width: 480px) {
  .post-card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}
```

现在卡片只看包裹它的容器有多宽，和视口无关。

## 容器查询单位

### cqi 与 cqw

容器查询还带来了一组相对单位，其中最实用的是 `cqi`：容器行内尺寸的 1%。

```css title="card.css"
.post-card h3 {
  font-size: clamp(1rem, 4cqi, 1.5rem);
}
```

标题字号会随卡片宽度平滑变化，而不是在断点处突然跳一下。

#### 什么时候用 cqw

`cqw` 指容器宽度的 1%，在横排文字下和 `cqi` 等价。我习惯统一用 `cqi`，这样以后支持竖排时不用改。

### 没有容器时会怎样

如果元素的祖先里没有任何容器，这些单位会退回到相对视口计算，不会报错，但效果可能不是你想要的。

## 在 Tailwind 里使用

Tailwind CSS v4 内置了容器查询，不需要插件：

```html title="PostCard.astro" mark:1,3
<div class="@container">
  <article class="flex flex-col gap-4 @md:flex-row">
    <img class="aspect-video w-full rounded-lg object-cover @md:w-48" src="/img/cover/12.webp" alt="" />
    <div>...</div>
  </article>
</div>
```

`@container` 声明容器，`@md:` 这类前缀表示「容器宽度达到这个断点时」。命名容器写成 `@container/card`，查询时写 `@md/card:flex-row`。

## 踩过的坑

### 容器不能查询自己

`@container` 里的规则只能作用于容器的**后代**。我一开始把 `container-type` 和网格布局写在同一个元素上，结果怎么也不生效。解决方法就是多包一层。

### 和 overflow 的配合

声明为 `inline-size` 容器的元素会建立尺寸约束（size containment）。如果它的宽度原本依赖子元素撑开，比如在 `inline-block` 或 flex 子项里，宽度可能会塌成 0。给容器一个明确的宽度，或者让它在块级上下文里自然填满。

### 调试

Chrome 开发者工具的 Elements 面板会在容器元素旁标出 `container` 徽标，点一下可以高亮这个容器。排查不生效的问题时，先确认这里有没有标记。

## 小结

容器查询把「布局随空间变化」这件事交还给了组件本身。改完之后，卡片放到哪里都不用额外写变体。

;;;cq 原生 CSS
```css
.wrapper { container: card / inline-size; }
@container card (min-width: 480px) {
  .post-card { display: grid; grid-template-columns: 200px 1fr; }
}
```
;;;

;;;cq Tailwind v4
```html
<div class="@container">
  <article class="flex flex-col @md:flex-row">...</article>
</div>
```
;;;

更完整的说明可以看 [MDN 的容器查询指南](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_containment/Container_size_and_style_queries)。

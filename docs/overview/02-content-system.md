# 内容系统深度解析

## 概述

astro-koharu 的内容系统基于 **Astro Content Collections**，这是 Astro 原生的内容管理方案。它提供了类型安全的内容查询、Markdown/MDX 支持、以及灵活的 Schema 验证。

本项目的内容系统还包含了一套复杂的**分类系统**，用于处理从 Hexo 迁移过来的多层级分类结构。

---

## Astro Content Collections 基础

### 什么是 Content Collections？

Content Collections 是 Astro 管理内容的官方方式，它将 Markdown/MDX 文件组织成可查询的集合：

```plain
src/
├── content.config.ts  # Schema 与 loader 定义
└── content/
    └── blog/          # blog 集合
        ├── life/
        │   └── post1.md
        ├── note/
        │   ├── front-end/
        │   │   └── react-learning.md
        │   └── algorithm/
        │       └── sorting.md
        └── weekly/
            └── issue-01.md
```

### 核心优势

1. **类型安全**：Schema 验证 + TypeScript 类型推导
2. **自动解析**：Markdown frontmatter 自动转换为对象
3. **高性能查询**：构建时静态生成，无运行时开销
4. **灵活组织**：支持嵌套目录结构

---

## Schema 定义

### 配置文件 `src/content.config.ts`

```typescript
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import type { BlogSchema, BlogSchemaInput } from 'types/blog';

const blogCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    // 必填字段
    title: z.string(),              // 文章标题
    date: z.date(),                 // 发布日期

    // 可选字段
    description: z.string().optional(),  // 文章描述/摘要
    link: z.string().optional(),         // 自定义 URL 标识符
    cover: z.string().optional(),        // 封面图片路径
    tags: z.array(z.string()).optional(), // 标签数组

    // Hexo 兼容字段
    subtitle: z.string().optional(),     // 副标题（旧 Hexo）
    catalog: z.boolean().optional(),     // 是否显示目录
    sticky: z.boolean().optional(),      // 是否置顶

    // 分类字段（支持两种格式）
    categories: z
      .array(z.string())                    // 格式1: ['工具']
      .or(z.array(z.array(z.string())))     // 格式2: [['笔记', '前端', 'React']]
      .optional(),
  }) satisfies z.ZodType<BlogSchema, BlogSchemaInput>,
});

export const collections = {
  blog: blogCollection,
};
```

### Schema 字段说明

| 字段          | 类型       | 必填 | 说明                       |
| ------------- | ---------- | ---- | -------------------------- |
| `title`       | `string`   | 是   | 文章标题                   |
| `date`        | `Date`     | 是   | 发布日期                   |
| `description` | `string`   | 否   | SEO 描述/摘要              |
| `link`        | `string`   | 否   | 自定义 URL（默认用文件名） |
| `cover`       | `string`   | 否   | 封面图路径                 |
| `tags`        | `string[]` | 否   | 标签数组                   |
| `categories`  | 见下文     | 否   | 分类（支持多层级）         |
| `sticky`      | `boolean`  | 否   | 置顶标记                   |
| `catalog`     | `boolean`  | 否   | 是否生成目录（Hexo 遗留）  |
| `subtitle`    | `string`   | 否   | 副标题（Hexo 遗留）        |

---

## 分类系统实现

### 分类格式支持

项目支持两种分类格式，以兼容 Hexo 的历史数据：

```yaml
# 格式 1：单层分类
categories:
  - 工具

# 格式 2：多层分类（推荐）
categories:
  - [笔记, 前端, React]
```

这两种格式在代码中统一处理：

```typescript
// src/lib/content/posts.ts
const firstCategory = categories[0];

if (Array.isArray(firstCategory)) {
  // 格式 2：多层分类 ['笔记', '前端', 'React']
  return firstCategory.includes(categoryName);
} else if (typeof firstCategory === 'string') {
  // 格式 1：单层分类 '工具'
  return firstCategory === categoryName;
}
```

### 分类映射 `_config.yml`

由于 URL 中不能直接使用中文，项目使用映射表将中文分类名转换为英文 slug：

```yaml
# _config.yml
category_map:
  随笔: life
  笔记: note
  前端: front-end
  React: react
  工具: tools
  周刊: weekly
  # ... 共 22 个分类映射
```

映射表在 `src/constants/category.ts` 中被导出：

```typescript
// src/constants/category.ts
export const categoryMap: Record<string, string> = {
  '随笔': 'life',
  '笔记': 'note',
  '前端': 'front-end',
  // ...
};
```

### 分类树结构

分类以树形结构组织，支持无限层级嵌套：

```typescript
// src/lib/content/types.ts
type Category = {
  name: string;           // 分类名（中文）
  children?: Category[];  // 子分类
};
```

实际的分类树示例：

```plain
笔记
├── 前端
│   ├── JavaScript
│   └── React
├── 后端
├── 算法
└── CS基础
    └── 数据结构
```

---

## 核心函数详解

### 1. 获取分类列表 `getCategoryList()`

```typescript
// src/lib/content/categories.ts
export async function getCategoryList(): Promise<CategoryListResult> {
  const allBlogPosts = await getCollection('blog');
  const countMap: { [key: string]: number } = {};  // 分类文章计数
  const resCategories: Category[] = [];            // 分类树

  for (const post of allBlogPosts) {
    const { catalog, categories } = post.data;
    if (!catalog || !categories?.length) continue;

    const firstCategory = categories[0];

    if (Array.isArray(firstCategory)) {
      // 多层分类：['笔记', '前端', 'React']
      for (let j = 0; j < firstCategory.length; ++j) {
        const name = firstCategory[j];
        countMap[name] = (countMap[name] || 0) + 1;

        // 递归构建分类树
        if (j === 0) {
          addCategoryRecursively(resCategories, [], name);
        } else {
          const parentNames = firstCategory.slice(0, j);
          addCategoryRecursively(resCategories, parentNames, name);
        }
      }
    } else if (typeof firstCategory === 'string') {
      // 单层分类：'工具'
      countMap[firstCategory] = (countMap[firstCategory] || 0) + 1;
      addCategoryRecursively(resCategories, [], firstCategory);
    }
  }

  return { categories: resCategories, countMap };
}
```

**返回值结构**：

```typescript
{
  categories: [
    {
      name: '笔记',
      children: [
        { name: '前端', children: [{ name: 'React' }] },
        { name: '算法' }
      ]
    },
    { name: '工具' }
  ],
  countMap: {
    '笔记': 50,
    '前端': 30,
    'React': 15,
    '工具': 10
  }
}
```

### 2. 递归添加分类 `addCategoryRecursively()`

这是构建分类树的核心递归函数：

```typescript
// src/lib/content/categories.ts
export function addCategoryRecursively(
  rootCategories: Category[],
  parentNames: string[],
  name: string
) {
  if (parentNames.length === 0) {
    // 根分类：直接添加
    const index = rootCategories.findIndex((c) => c.name === name);
    if (index === -1) rootCategories.push({ name });
  } else {
    // 子分类：找到父分类后递归
    const rootParentName = parentNames[0];
    const index = rootCategories.findIndex((c) => c.name === rootParentName);

    if (index === -1) {
      // 父分类不存在，创建
      const rootParentCategory = { name: rootParentName, children: [] };
      rootCategories.push(rootParentCategory);
      addCategoryRecursively(rootParentCategory.children, parentNames.slice(1), name);
    } else {
      // 父分类存在，继续递归
      const rootParentCategory = rootCategories[index];
      if (!rootParentCategory?.children) rootParentCategory.children = [];
      addCategoryRecursively(rootParentCategory.children, parentNames.slice(1), name);
    }
  }
}
```

**执行流程示例**：

```plain
输入: ['笔记', '前端', 'React']

第 1 步: addCategoryRecursively([], [], '笔记')
  → categories = [{ name: '笔记' }]

第 2 步: addCategoryRecursively([], ['笔记'], '前端')
  → categories = [{ name: '笔记', children: [{ name: '前端' }] }]

第 3 步: addCategoryRecursively([], ['笔记', '前端'], 'React')
  → categories = [{
      name: '笔记',
      children: [{
        name: '前端',
        children: [{ name: 'React' }]
      }]
    }]
```

### 3. 构建分类路径 `buildCategoryPath()`

将分类名数组转换为 URL 路径：

```typescript
// src/lib/content/categories.ts
export function buildCategoryPath(categoryNames: string | string[]): string {
  if (!categoryNames) return '';

  const names = Array.isArray(categoryNames) ? categoryNames : [categoryNames];
  if (names.length === 0) return '';

  const slugs = names.map((name) => categoryMap[name]);
  return '/categories/' + slugs.join('/');
}

// 示例
buildCategoryPath(['笔记', '前端', 'React'])
// → '/categories/note/front-end/react'

buildCategoryPath('工具')
// → '/categories/tools'
```

### 4. 根据链接获取分类 `getCategoryByLink()`

从 URL 路径反向查找分类对象：

```typescript
// src/lib/content/categories.ts
export function getCategoryByLink(
  categories: Category[],
  link?: string
): Category | null {
  const name = getCategoryNameByLink(link ?? '');
  if (!name || !categories?.length) return null;

  for (const category of categories) {
    if (category.name === name) return category;

    // 递归搜索子分类
    if (category?.children?.length) {
      const res = getCategoryByLink(category.children, link);
      if (res) return res;
    }
  }
  return null;
}
```

---

## 文章查询函数

### 获取排序后的文章 `getSortedPosts()`

```typescript
// src/lib/content/posts.ts
export async function getSortedPosts(): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog');

  // 按日期降序排列（最新在前）
  return posts.sort((a, b) => {
    return new Date(b.data.date).getTime() - new Date(a.data.date).getTime();
  });
}
```

### 获取置顶文章 `getPostsBySticky()`

```typescript
// src/lib/content/posts.ts
export async function getPostsBySticky(): Promise<{
  stickyPosts: CollectionEntry<'blog'>[];
  nonStickyPosts: CollectionEntry<'blog'>[];
}> {
  const posts = await getSortedPosts();

  const stickyPosts: CollectionEntry<'blog'>[] = [];
  const nonStickyPosts: CollectionEntry<'blog'>[] = [];

  for (const post of posts) {
    if (post.data?.sticky) {
      stickyPosts.push(post);
    } else {
      nonStickyPosts.push(post);
    }
  }

  return { stickyPosts, nonStickyPosts };
}
```

### 获取分类下的文章 `getPostsByCategory()`

```typescript
// src/lib/content/posts.ts
export async function getPostsByCategory(categoryName: string): Promise<BlogPost[]> {
  const posts = await getSortedPosts();

  return posts.filter((post) => {
    const { categories } = post.data;
    if (!categories?.length) return false;

    const firstCategory = categories[0];

    // 处理两种分类格式
    if (Array.isArray(firstCategory)) {
      return firstCategory.includes(categoryName);
    } else if (typeof firstCategory === 'string') {
      return firstCategory === categoryName;
    }
    return false;
  });
}
```

### 获取系列文章 `getSeriesPosts()`

系列文章是指同一最深层分类下的所有文章：

```typescript
// src/lib/content/posts.ts
export async function getSeriesPosts(post: BlogPost): Promise<BlogPost[]> {
  const lastCategory = getPostLastCategory(post);
  if (!lastCategory.name) return [];

  return await getPostsByCategory(lastCategory.name);
}

// 获取文章的最深层分类
export function getPostLastCategory(post: BlogPost): { link: string; name: string } {
  const { categories } = post.data;
  if (!categories?.length) return { link: '', name: '' };

  const firstCategory = categories[0];

  if (Array.isArray(firstCategory)) {
    // ['笔记', '前端', 'React'] → 返回 'React'
    return {
      link: buildCategoryPath(firstCategory),
      name: firstCategory[firstCategory.length - 1],
    };
  } else if (typeof firstCategory === 'string') {
    return {
      link: buildCategoryPath(firstCategory),
      name: firstCategory,
    };
  }

  return { link: '', name: '' };
}
```

### 获取相邻系列文章 `getAdjacentSeriesPosts()`

用于文章页面的"上一篇/下一篇"导航：

```typescript
// src/lib/content/posts.ts
export async function getAdjacentSeriesPosts(currentPost: BlogPost): Promise<{
  prevPost: BlogPost | null;
  nextPost: BlogPost | null;
}> {
  const seriesPosts = await getSeriesPosts(currentPost);

  if (seriesPosts.length === 0) {
    return { prevPost: null, nextPost: null };
  }

  const currentSlug = getPostSlug(currentPost);
  const currentIndex = seriesPosts.findIndex(
    (post) => getPostSlug(post) === currentSlug
  );

  if (currentIndex === -1) {
    return { prevPost: null, nextPost: null };
  }

  // 因为文章按日期降序排列（最新在前）
  // prevPost 是更新的文章（索引 - 1）
  // nextPost 是更旧的文章（索引 + 1）
  const prevPost = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < seriesPosts.length - 1
    ? seriesPosts[currentIndex + 1]
    : null;

  return { prevPost, nextPost };
}
```

---

## 周刊专栏功能

项目支持特殊的"周刊"分类，与普通文章分开展示：

```typescript
// src/lib/content/posts.ts

// 获取所有周刊文章
export async function getWeeklyPosts(): Promise<BlogPost[]> {
  const { featuredSeries } = siteConfig;
  if (!featuredSeries?.enabled || !featuredSeries.categoryName) {
    return [];
  }

  return await getPostsByCategory(featuredSeries.categoryName);
}

// 获取最新周刊
export async function getLatestWeeklyPost(): Promise<BlogPost | null> {
  const weeklyPosts = await getWeeklyPosts();
  return weeklyPosts[0] ?? null;
}

// 获取非周刊文章（首页使用）
export async function getNonWeeklyPosts(): Promise<BlogPost[]> {
  const { featuredSeries } = siteConfig;
  if (!featuredSeries?.enabled || !featuredSeries.categoryName) {
    return await getSortedPosts();
  }

  const allPosts = await getSortedPosts();
  return allPosts.filter(
    (post) => !isPostInCategory(post, featuredSeries.categoryName)
  );
}
```

---

## 文章 Frontmatter 示例

### 基础文章

```yaml
---
title: React Hooks 学习笔记
date: 2024-01-15
description: 深入理解 React Hooks 的工作原理
tags:
  - React
  - Hooks
  - 前端
categories:
  - [笔记, 前端, React]
catalog: true
---
文章内容...
```

### 置顶文章

```yaml
---
title: 网站公告
date: 2024-03-01
sticky: true
categories:
  - 随笔
---
```

### 自定义链接

```yaml
---
title: 非常长的文章标题
link: short-url
date: 2024-02-20
---
# 访问路径将是 /post/short-url 而不是文件名
```

---

## 数据流图

```plain
┌─────────────────────────────────────────────────────────────┐
│                    Markdown 文件                            │
│   src/content/blog/note/front-end/react-hooks.md           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Schema 验证                              │
│   src/content.config.ts → glob loader + z.object({...})    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Content Collection API                      │
│   getCollection('blog') → CollectionEntry<'blog'>[]        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    工具函数处理                              │
│   ┌─────────────────┐  ┌─────────────────┐                 │
│   │  posts.ts       │  │  categories.ts  │                 │
│   │  - getSorted    │  │  - getList      │                 │
│   │  - getByCategory│  │  - buildPath    │                 │
│   │  - getSeries    │  │  - getByLink    │                 │
│   └─────────────────┘  └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    页面组件                                  │
│   ┌─────────────────┐  ┌─────────────────┐                 │
│   │  PostList.astro │  │ CategoryList    │                 │
│   │  PostCard.astro │  │ .astro          │                 │
│   └─────────────────┘  └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    静态 HTML 输出                            │
│   dist/post/react-hooks/index.html                         │
│   dist/categories/note/front-end/react/index.html          │
└─────────────────────────────────────────────────────────────┘
```

---

## 学习要点

1. **Content Collections**：Astro 原生内容管理，提供类型安全和 Schema 验证
2. **双格式分类**：兼容 Hexo 的单层分类和多层分类格式
3. **分类映射**：中文分类名 → 英文 slug 的转换机制
4. **递归算法**：分类树的构建和遍历
5. **工具函数分层**：
   - `posts.ts`：文章查询（排序、筛选、分页）
   - `categories.ts`：分类操作（构建、查找、路径生成）
   - `tags.ts`：标签统计

---

## 相关文件

| 文件                            | 说明                |
| ------------------------------- | ------------------- |
| `src/content.config.ts`         | Loader 与 Schema 定义 |
| `src/content/blog/`             | 博客文章目录        |
| `src/lib/content/posts.ts`      | 文章查询函数        |
| `src/lib/content/categories.ts` | 分类处理函数        |
| `src/lib/content/tags.ts`       | 标签处理函数        |
| `src/lib/content/types.ts`      | 类型定义            |
| `src/constants/category.ts`     | 分类映射表          |
| `_config.yml`                   | Hexo 分类映射源文件 |

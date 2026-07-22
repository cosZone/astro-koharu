# Markdown 解析与样式系统

本文档详细介绍 astro-koharu 博客项目中的 Markdown 解析、渲染和样式美化系统。

## 目录

- [Markdown 配置](#markdown-配置)
- [语法高亮](#语法高亮)
- [样式系统](#样式系统)
- [内容增强](#内容增强)
- [目录导航](#目录导航)
- [扩展功能](#扩展功能)

## Markdown 配置

### Astro Markdown 设置

项目使用 Astro 内置的 Markdown 处理能力，配置位于 `astro.config.mjs:15-37`：

```javascript
markdown: {
  // 启用 GitHub Flavored Markdown
  gfm: true,

  // Rehype 插件配置
  rehypePlugins: [
    rehypeSlug,                    // 自动为标题生成 ID
    [
      rehypeAutolinkHeadings,      // 自动为标题生成锚点链接
      {
        behavior: 'append',
        properties: {
          className: ['anchor-link'],
        },
      },
    ],
  ],

  // Shiki 语法高亮配置
  shikiConfig: {
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
}
```

**关键特性：**

- **GFM 支持**：启用 GitHub Flavored Markdown，支持表格、任务列表、删除线等扩展语法
- **自动 ID 生成**：使用 `rehype-slug` 为所有标题（h1-h6）自动生成 URL 友好的 ID
- **自动锚点链接**：使用 `rehype-autolink-headings` 在标题后追加可点击的锚点图标

### Content Collections 配置

博客文章使用 Astro Content Collections 管理，loader 与 Schema 定义在 `src/content.config.ts`：

```typescript
const blogCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),                       // 文章标题
    description: z.string().optional(),      // 描述
    link: z.string().optional(),             // 自定义链接
    date: z.date(),                          // 发布日期
    cover: z.string().optional(),            // 封面图片
    tags: z.array(z.string()).optional(),    // 标签
    categories: z.array(z.string())          // 分类（支持嵌套）
      .or(z.array(z.array(z.string())))
      .optional(),
    // Hexo 兼容性字段
    subtitle: z.string().optional(),
    catalog: z.boolean().optional(),
    sticky: z.boolean().optional(),
  }),
});
```

**特点：**

- 类型安全的 frontmatter 验证
- 支持分层分类结构
- 保持与 Hexo 博客的兼容性

## 语法高亮

### Shiki 集成

项目使用 Shiki 进行代码语法高亮，支持明暗双主题：

- **浅色主题**：`github-light` - 适合白天阅读
- **深色主题**：`github-dark` - 适合夜间阅读

Shiki 在构建时进行语法高亮，生成的 HTML 包含内联样式，无需运行时 JavaScript。

**优势：**

- 零运行时开销
- 精准的语法高亮（基于 VSCode 的 TextMate 语法）
- 主题自动跟随系统/用户偏好切换

## 样式系统

### Tailwind Typography

项目使用 `@tailwindcss/typography` 插件提供基础排版样式，配置在 `tailwind.config.mjs:138`：

```javascript
plugins: [
  require('@tailwindcss/typography'),
  // ... other plugins
];
```

文章内容应用 `.prose` 类来获得优雅的排版效果（见 `src/pages/post/[...slug].astro:96`）：

```html
<article class="prose md:prose-sm dark:prose-invert">
  <CustomContent Content="{Content}" />
</article>
```

**Typography 提供的样式：**

- 合理的字体大小和行高
- 段落间距和列表缩进
- 链接、引用、代码块的默认样式
- 响应式排版（通过 `md:prose-sm` 修饰符）
- 深色模式支持（`dark:prose-invert`）

### 自定义 Markdown 样式

在 `src/styles/theme/markdown.css` 中对 `.prose` 进行了深度定制：

#### 1. 全局设置

```css
.prose {
  /* 移除默认最大宽度限制 */
  max-width: none;
}
```

#### 2. 链接样式

```css
.prose a {
  @apply text-primary hover:text-blue no-underline transition-colors duration-300 hover:underline;
}
```

**特点：**

- 使用主题色 `text-primary`
- Hover 时变为蓝色并显示下划线
- 300ms 平滑过渡动画

#### 3. 标题锚点链接

```css
/* 标题滚动偏移，避免被固定头部遮挡 */
.prose h1,
h2,
h3,
h4,
h5,
h6 {
  position: relative;
  scroll-margin-top: 4rem; /* 64px 偏移 */
}

/* 锚点图标 */
.prose a.anchor-link > span::before {
  content: '';
  width: 1em;
  height: 1em;
  position: absolute;
  right: -1.25em;
  top: 0.2em;
  opacity: 0;
  transition: opacity 0.3s;

  /* 使用 SVG mask 显示 # 图标 */
  background-color: currentColor;
  mask-image: url('data:image/svg+xml,...');
  /* ... */
}

/* 标题 hover 时显示锚点图标 */
.prose h1:hover .anchor-link > span::before,
.prose h2:hover .anchor-link > span::before {
  opacity: 1;
}
```

**工作原理：**

1. `rehype-autolink-headings` 在每个标题后插入 `<a class="anchor-link">` 元素
2. 使用 CSS `::before` 伪元素在标题右侧显示 # 图标
3. 默认透明，鼠标悬停时渐显
4. `scroll-margin-top` 确保点击锚点后标题不会被固定头部遮挡

### 文章组件样式

`src/styles/components/post.css` 提供目录（TOC）相关样式：

```css
/* 自定义滚动条 */
.toc-container::-webkit-scrollbar {
  width: 4px;
}
.toc-container::-webkit-scrollbar-thumb {
  background: hsl(var(--primary) / 0.3);
  border-radius: 2px;
}

/* 目录项 hover 效果 */
.toc-item::before {
  content: '';
  position: absolute;
  left: 0;
  width: 0;
  height: 100%;
  background: hsl(var(--primary) / 0.1);
  transition: width 0.2s ease;
}
.toc-item:hover::before {
  width: 100%;
}
```

## 内容增强

### CustomContent 组件

`src/components/common/CustomContent.astro` 负责渲染 Markdown 内容并提供运行时增强功能。

#### 组件配置

```typescript
interface ContentConfig {
  addBlankTarget: boolean;   // 为外部链接添加 target="_blank"
  smoothScroll: boolean;      // 启用平滑滚动
}
```

默认配置（`src/constants/content-config.ts:8-11`）：

```typescript
export const defaultContentConfig: ContentConfig = {
  addBlankTarget: true,
  smoothScroll: true,
};
```

#### 功能实现

1. **外部链接处理**（`CustomContent.astro:37-49`）

```javascript
// 为所有外部链接添加 target="_blank"
if (config.addBlankTarget) {
  const links = contentContainer.querySelectorAll('a[href]');
  links.forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (href.startsWith('http') || href.startsWith('//')) {
      link.setAttribute('target', '_blank');
    }
  });
}
```

2. **平滑滚动**（`CustomContent.astro:52-76`）

```javascript
if (config.smoothScroll) {
  const anchorLinks = contentContainer.querySelectorAll('a.anchor-link[href^="#"]');
  anchorLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href')?.substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        // 更新 URL hash
        history.pushState(null, '', `#${targetId}`);
      }
    });
  });
}
```

**优点：**

- 平滑滚动到目标标题
- 更新 URL 但不触发页面跳转
- 更好的用户体验

#### 生命周期

```javascript
// Astro 页面切换时重新运行
document.addEventListener('astro:page-load', enhanceContent);

// 初次加载时运行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhanceContent);
} else {
  enhanceContent();
}
```

## 目录导航

### TableOfContents 组件

`src/components/layout/TableOfContents/index.tsx` 提供智能目录导航功能。

#### 核心特性

1. **自动提取标题树**

使用自定义 Hook `useHeadingTree()` 从文档中提取所有标题并构建层次结构。

2. **活跃标题检测**

```typescript
const activeId = useActiveHeading({ offsetTop: 120 });
```

- 滚动时自动检测当前可见的标题
- 考虑固定头部高度偏移（120px）
- 在目录中高亮当前标题

3. **手风琴式展开**（`TableOfContents/index.tsx:40-98`）

```typescript
const handleHeadingClick = useCallback((id: string) => {
  // 滚动到目标标题
  element.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 手风琴逻辑：
  // 1. 关闭同级其他标题
  // 2. 打开父级标题链
  // 3. 如果有子标题则展开
  setExpandedIds((prev) => {
    // ... 复杂的状态管理逻辑
  });
}, [headings, setExpandedIds]);
```

**用户体验：**

- 点击标题时，只展开该标题及其父级
- 自动折叠同级其他标题，保持界面简洁
- 平滑滚动到目标位置

4. **分层渲染**

通过 `HeadingList` 子组件递归渲染嵌套的标题结构，支持任意深度的标题层级。

### 集成到侧边栏

目录在文章详情页的侧边栏中显示（`src/components/layout/HomeSider.astro:56`）：

```html
<div slot="directory" class="sider-slot" data-slot-type="directory">
  {type === HomeSiderType.POST && <TableOfContents client:load />}
</div>
```

**侧边栏功能：**

- 分段控制（信息、目录、系列）
- 平滑切换动画
- 响应式：移动端隐藏，桌面端固定显示
- 自定义滚动条样式

## 扩展功能

### 1. 阅读时间计算

虽然本文档聚焦 Markdown 解析和样式，但值得一提的是项目还包含阅读时间估算功能。

依赖：`reading-time` 包（`package.json:54`）

用法示例：

```typescript
import readingTime from 'reading-time';
const stats = readingTime(post.body);
console.log(stats.text); // "5 min read"
```

### 2. RSS Feed

项目生成 RSS feed，使用 Markdown 渲染后的内容。

位置：`src/pages/rss.xml.ts`
依赖：`@astrojs/rss` 包（`package.json:20`）

### 3. SEO 优化

文章详情页（`src/pages/post/[...slug].astro:29-41`）包含结构化数据（JSON-LD）：

```javascript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: title,
  description: description || post.body?.slice(0, 100),
  keywords: categories?.length ? tags.concat(categories[0]) : tags,
  author: { '@type': 'Person', name: siteConfig.author },
  datePublished: parseDate(date, 'YYYY-MM-DD'),
};
```

**好处：**

- 帮助搜索引擎理解文章内容
- 可能在搜索结果中显示富文本片段
- 改善 SEO 和社交媒体分享效果

## 最佳实践

### 编写 Markdown

1. **使用语义化标题**

   ```markdown
   # 文章标题（仅一个 h1）

   ## 主要章节

   ### 小节

   #### 细节
   ```

2. **利用 GFM 扩展**

   ```markdown
   | 表头 1 | 表头 2 |
   | ------ | ------ |
   | 内容   | 内容   |

   - [x] 已完成任务
   - [ ] 待办任务

   ~~删除线文本~~
   ```

3. **代码块指定语言**
   ````markdown
   ```typescript
   const hello: string = "world";
   ```
   ````

### 样式定制

1. **扩展 prose 样式**

   在 `src/styles/theme/markdown.css` 中添加自定义规则：

   ```css
   .prose blockquote {
     @apply border-primary/50 bg-primary/5 border-l-4 italic;
   }
   ```

2. **添加自定义组件**

   在 Markdown 中使用 MDX 组件：

   ```markdown
   import { Callout } from '@components/ui/Callout';

   <Callout type="warning">
   这是一个警告提示框
   </Callout>
   ```

3. **调整 Shiki 主题**

   修改 `astro.config.mjs` 中的 `shikiConfig.themes` 以使用不同的代码高亮主题。

## 文件索引

**配置文件：**

- `astro.config.mjs:15-37` - Markdown 主配置
- `tailwind.config.mjs:138` - Typography 插件
- `src/content.config.ts` - Content Collections loader 与 Schema

**样式文件：**

- `src/styles/theme/markdown.css` - Markdown 自定义样式
- `src/styles/components/post.css` - 文章组件样式
- `src/styles/global/tailwind.css` - Tailwind 基础配置

**组件文件：**

- `src/components/common/CustomContent.astro` - 内容增强组件
- `src/components/layout/TableOfContents/index.tsx` - 目录导航组件
- `src/components/layout/HomeSider.astro` - 侧边栏容器

**页面文件：**

- `src/pages/post/[...slug].astro` - 文章详情页模板

**常量配置：**

- `src/constants/content-config.ts` - 内容增强配置

## 总结

astro-koharu 的 Markdown 系统通过以下技术栈提供了强大而优雅的内容渲染能力：

- **Astro + Rehype** - 灵活的 Markdown 处理管线
- **Shiki** - 高质量的语法高亮
- **Tailwind Typography** - 专业的排版基础
- **自定义 CSS** - 精细的样式控制
- **React 增强组件** - 动态交互功能（目录、平滑滚动）

这套系统在保持简洁易用的同时，为读者提供了出色的阅读体验，为作者提供了强大的内容表达能力。

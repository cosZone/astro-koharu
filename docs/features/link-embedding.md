# 链接嵌入功能

![](https://r2.cosine.ren/i/2026/01/6804aa167fd4cf7022a9b511d52017ce.webp)

自动将独行的 Twitter/X、CodePen 链接转换为嵌入组件,并为其他链接显示 OG 预览卡片。

## 功能特性

### 1. Tweet 自动嵌入

将独行的 Twitter 或 X 链接自动转换为美观的 Tweet 嵌入组件:

- ✅ 支持 `twitter.com` 和 `x.com` 域名
- ✅ 仅 16KB 大小 (vs Twitter 原生 iframe 560KB)
- ✅ 自动适配深色/浅色主题
- ✅ 服务端渲染,无需客户端 JavaScript 加载
- ✅ 无 iframe,避免布局偏移

**示例:**

```markdown
这是一条独行的 Tweet 链接,会自动转换为嵌入组件:

https://twitter.com/vercel/status/1683949196632969217

或者使用 x.com 域名:

https://x.com/elonmusk/status/1683631781486342144
```

### 2. CodePen 自动嵌入

将独行的 CodePen 链接自动转换为交互式代码演示:

- ✅ 支持 `codepen.io` 域名
- ✅ 使用 CodePen 官方嵌入格式
- ✅ 支持实时代码编辑和预览
- ✅ 自动适配 Astro 页面导航
- ✅ 按需加载,优化性能
- ✅ 支持深色/浅色主题

**示例:**

```markdown
这是一个独行的 CodePen 链接,会自动转换为交互式嵌入:

https://codepen.io/username/pen/PenId

支持的格式:
https://codepen.io/username/pen/PenId
https://codepen.io/username/details/PenId
```

**技术实现:**

- 使用 CodePen 官方嵌入 API (`__CPEmbed`)
- 自动处理 Astro 页面转换,确保嵌入正确初始化
- 脚本按需加载,仅在页面包含 CodePen 嵌入时加载
- 支持多个 CodePen 嵌入在同一页面

### 3. 通用链接预览

为独行的普通链接显示 OG (Open Graph) 预览卡片:

- ✅ 构建时获取 OG 元数据 (标题、描述、图片)
- ✅ 完全静态化,无运行时开销
- ✅ 显示网站图标和域名
- ✅ 响应式设计,适配移动端
- ✅ 优雅的错误处理和降级
- ✅ 支持深色/浅色主题
- ✅ SEO 友好

**示例:**

```markdown
这是一个独行的链接,会显示 OG 预览:

https://github.com/vercel/react-tweet

另一个例子:

https://react-tweet.vercel.app/
```

### 3. 行内链接保持不变

段落中的链接不会被转换,保持原有样式:

```markdown
这段话中的链接 [react-tweet](https://github.com/vercel/react-tweet) 不会被嵌入。
```

## 工作原理

### Markdown 处理流程

1. **Remark 插件解析**: `remark-link-embed` 插件在 Markdown 编译时识别独行链接
2. **链接分类**:
   - 检测 Twitter/X 链接并提取 Tweet ID (客户端水合)
   - 其他链接使用 **metascraper** 在构建时获取 OG 数据 (服务端渲染)
3. **构建时处理**:
   - Tweet: 生成占位符,客户端水合
   - 链接预览: 使用 metascraper 获取元数据,生成完整静态 HTML
4. **客户端水合**: `EmbedHydrator` 组件仅处理 Tweet 嵌入

### 架构图

```plain
Markdown 文件
    ↓
remark-link-embed 插件 (识别独行链接)
    ↓
├─ Tweet 链接 → 生成占位符 (<div data-tweet-embed>)
│                    ↓
│               EmbedHydrator (客户端水合 TweetEmbed)
│
└─ 普通链接 → metascraper 构建时获取 OG 数据
                   ↓
              生成完整静态 HTML
```

## 配置选项

在 `src/constants/content-config.ts` 中可以配置:

```typescript
export interface ContentConfig {
  // ... 其他配置

  // 是否启用链接嵌入功能
  enableLinkEmbed: boolean;

  // 是否启用 Tweet 嵌入
  enableTweetEmbed: boolean;

  // 是否启用 OG 链接预览
  enableOGPreview: boolean;

  // 预览数据缓存时间(秒)
  previewCacheTime: number;

  // 是否懒加载嵌入内容
  lazyLoadEmbeds: boolean;
}

export const defaultContentConfig: ContentConfig = {
  // ... 其他配置
  enableLinkEmbed: true,
  enableTweetEmbed: true,
  enableOGPreview: true,
  enableCodePenEmbed: true,
  previewCacheTime: 30, // 30 days
  lazyLoadEmbeds: true,
};
```

## 文件结构

```plain
src/
├── lib/
│   └── markdown/
│       ├── remark-link-embed.ts      # Remark 插件(使用 metascraper)
│       └── link-utils.ts             # 链接检测工具
├── components/
│   └── embed/
│       ├── TweetEmbed.tsx            # Tweet 嵌入组件
│       └── EmbedHydrator.tsx         # 水合组件(仅处理 tweets)
└── styles/
    └── components/
        └── embed.css                 # 嵌入组件样式
```

## 构建时数据获取 (metascraper)

链接预览使用 **metascraper** 在构建时获取 OG 元数据,无需 API 端点:

- **强大的元数据提取**: metascraper 支持多种元数据源和规则
- **构建时处理**: OG 数据在 Markdown 编译期间获取
- **完全静态化**: 无运行时开销
- **优雅降级**: 如果获取失败,会降级为简单链接
- **自动更新**: 链接内容更新需要重新构建站点

### metascraper 特性

- 支持 og:title, og:description, og:image 等标准 Open Graph 标签
- 自动提取网站 logo/favicon
- 智能回退到 meta 标签和 HTML title
- 高度可定制的规则系统

## 性能优化

### Tweet 嵌入

- 使用 `react-tweet` 库,仅 16KB vs 原生 Twitter 嵌入 560KB
- 服务端渲染,首屏即显示
- 无 iframe,避免额外的 HTTP 请求和布局偏移

### 链接预览

- **完全静态化**: 构建时获取 OG 数据,零运行时开销
- **无 JavaScript**: 不需要客户端 JavaScript
- **SEO 友好**: 搜索引擎可以直接索引预览内容
- **优雅降级**: 获取失败时显示简单链接
- **更快的页面加载**: 无需额外的 API 请求

## 主题支持

两种嵌入都支持深色/浅色主题:

- **TweetEmbed**: 通过 MutationObserver 监听 `document.documentElement` 的 class 变化
- **链接预览**: 使用 Tailwind 的主题变量,自动适配,无需 JavaScript

## 故障排除

### Tweet 不显示

1. 检查 Tweet ID 是否正确
2. 确认网络连接正常
3. 检查 Tweet 是否已被删除或设为私密

### 链接预览不显示

1. 检查目标网站是否有 OG 标签
2. 查看构建日志,确认 OG 数据获取是否成功
3. 如果网站需要认证或有访问限制,预览可能无法获取
4. 检查网络连接,确保构建时能访问目标网站

### 样式问题

1. 确保 `src/styles/components/embed.css` 已导入
2. 检查 react-tweet 样式是否正确加载
3. 清除浏览器缓存重试

## 禁用功能

如需禁用此功能,可在 `src/constants/content-config.ts` 中设置:

```typescript
export const defaultContentConfig: ContentConfig = {
  // ...
  enableLinkEmbed: false,
  // 或单独禁用某个功能
  enableTweetEmbed: false,
  enableOGPreview: false,
};
```

## 技术栈

- **react-tweet**: Tweet 嵌入库
- **metascraper**: 强大的元数据提取库，构建时获取 OG 数据
- **remark**: Markdown 处理
- **unist-util-visit**: AST 遍历
- **React 19**: Tweet 组件渲染
- **Astro 5**: 框架集成
- **静态站点生成 (SSG)**: 链接预览在构建时生成

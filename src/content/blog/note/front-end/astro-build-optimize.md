---
title: Astro 构建性能优化
link: astro-build-optimize
catalog: true
date: 2025-12-30 21:30:40
tags:
  - 前端
  - 工程化
  - 性能优化
categories:
  - [笔记, 前端]
---

## 优化结果

### 优化前

当前构建时间分析：

- 总构建时间: ~92s
- 类型生成: 402ms
- 静态入口点: 2.36s
- Vite 客户端构建: 2.39s
- pagefind 索引: ~4s
- 静态路由生成: 79.94s (最大瓶颈，每页面约 170-330ms)

```bash
21:25:56 [build] ✓ Completed in 402ms.
21:25:56 [build] Building static entrypoints...
21:25:59 [vite] ✓ built in 2.36s
21:25:59 [build] ✓ Completed in 2.39s.
……
21:26:59   └─ /posts/17/index.html (+176ms)
……
21:26:59 λ src/pages/rss.xml.ts
21:26:59   └─ /rss.xml (+427ms)
21:27:24   └─ /index.html (+237ms)
21:27:24 ✓ Completed in 79.29s.

21:27:27 [pagefind] Pagefind indexed 360 pages
21:27:27 [build] Waiting for integration "pagefind", hook "astro:build:done"...
21:27:28 [pagefind] Pagefind wrote index to /Users/nahida/Documents/Programming/me/astro-koharu/dist/pagefind
21:27:28 [build] 358 page(s) built in 91.94s
21:27:28 [build] Complete!
```

Vercel 上更差：

![](https://r2.cosine.ren/i/2025/12/457ac83c730101f0275f5d44b69fda73.webp)

### 优化后

## 优化手段

### 条件排除 Three.js (Vite Virtual Module)

圣诞特效开启会引入 Three.js 约 879KB，将其改为在 `christmasConfig.enabled = false` 时彻底排除引用。

Astro 的 `client:*` 指令（如 `client:idle`）在构建时静态分析，**即使组件在运行时不渲染，只要有静态 import，Vite 就会打包该模块**。

```astro
---
// 即使 christmasConfig.enabled = false，Three.js 仍会被打包
import { SnowfallCanvas } from './SnowfallCanvas';
---
{christmasConfig.enabled && <SnowfallCanvas client:idle />}
```

#### 解决方案：Vite Virtual Module Plugin

使用 Vite 的 [Virtual Modules](https://vite.dev/guide/api-plugin#virtual-modules-convention) 在构建时条件替换模块：

```js
// astro.config.mjs
function conditionalSnowfall() {
  const VIRTUAL_ID = "virtual:snowfall-canvas";
  const RESOLVED_ID = "\0" + VIRTUAL_ID; // Vite 约定：\0 前缀标记虚拟模块
  const isEnabled =
    christmasConfig.enabled && christmasConfig.features.snowfall;

  return {
    name: "conditional-snowfall",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      // 当禁用时，拦截对 SnowfallCanvas 的导入
      if (!isEnabled && id === "@components/christmas/SnowfallCanvas") {
        return RESOLVED_ID; // 重定向到虚拟模块
      }
    },
    load(id) {
      if (id === RESOLVED_ID) {
        // 返回空组件，不引入 Three.js
        return "export function SnowfallCanvas() { return null; }";
      }
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [conditionalSnowfall() /* ... */],
  },
});
```

#### 代码解读

| 概念             | 说明                                            |
| ---------------- | ----------------------------------------------- |
| `virtual:` 前缀  | Vite 约定的虚拟模块命名规范，表示这不是真实文件 |
| `\0` 前缀        | Rollup/Vite 内部约定，防止其他插件处理这个 ID   |
| `resolveId` 钩子 | 拦截模块解析，决定模块 ID 如何映射              |
| `load` 钩子      | 为虚拟模块提供实际代码内容                      |

#### 工作流程

1. Vite 解析 import '@components/christmas/SnowfallCanvas'
2. conditionalSnowfall 插件的 resolveId 被调用
3. 如果 isEnabled = false，返回虚拟模块 ID '\0virtual:snowfall-canvas'
4. Vite 调用 load 钩子获取代码
5. 返回 'export function SnowfallCanvas() { return null; }'
6. Three.js 从未被导入，不会进入 bundle

#### 效果

| 配置             | Bundle 大小 | 说明            |
| ---------------- | ----------- | --------------- |
| `enabled: true`  | +879KB      | Three.js 被打包 |
| `enabled: false` | +0KB        | Three.js 被排除 |

### OG 链接预览缓存

为 `remarkLinkEmbed` 插件添加文件系统缓存，避免每次构建都发起 HTTP 请求获取 OG 数据。

```ts
// src/lib/markdown/remark-link-embed.ts
const CACHE_FILE = ".cache/og-data.json";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 天

function getCachedOGData(url: string): OGData | null {
  const cache = loadCache();
  const entry = cache[url];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
}
```

这个当然对 Vercel 的速度不会有提升 hhhh 但是在本地构建速度会更快了。

## Refs

- [Vite Plugin API - Virtual Modules Convention](https://vite.dev/guide/api-plugin#virtual-modules-convention)
- [Rollup Plugin Development - resolveId](https://rollupjs.org/plugin-development/#resolveid)
- [Astro Build Speed Optimization: From 9642s to 2659s (340k pages)](https://www.reddit.com/r/astrojs/comments/1n8fntg/astro_build_speed_optimization_from_9642s_to/)
- [Build Speed Optimization options for largish (124k files, 16gb) SSG site?](https://www.reddit.com/r/astrojs/comments/1escwhb/build_speed_optimization_options_for_largish_124k/)

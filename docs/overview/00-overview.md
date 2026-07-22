# astro-koharu 项目总览

## 项目简介

astro-koharu 是一个基于 **Astro 6.x** 构建的现代化静态博客系统，从 Hexo 迁移而来，灵感源自 Shoka 主题。项目采用 React 实现交互组件，Tailwind CSS 进行样式设计，同时保持与原有 Hexo 博客内容的兼容性。

### 项目特点

- **高性能**：Astro Islands 架构，默认零 JavaScript，按需加载
- **现代化**：React 19 + Tailwind CSS 4 + Motion 动画库
- **内容优先**：Astro Content Collections 管理 183+ 篇博客文章
- **全文搜索**：Pagefind 静态搜索，无需后端
- **主题切换**：深色/浅色模式，支持 View Transitions 动画
- **Hexo 兼容**：保留原有文章格式和分类结构

---

## 技术栈概览

```plain
┌─────────────────────────────────────────────────────────────┐
│                        astro-koharu                         │
├─────────────────────────────────────────────────────────────┤
│  框架层                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Astro 6.x  │  │  React 19   │  │  TypeScript │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  样式层                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Tailwind 4  │  │   Motion    │  │  CSS Vars   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  功能层                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Nanostores  │  │  Pagefind   │  │ Floating UI │         │
│  │  状态管理    │  │  全文搜索    │  │  浮动定位    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  内容层                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Content    │  │   Shiki     │  │   Rehype    │         │
│  │ Collections │  │  代码高亮    │  │  Markdown   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 核心依赖说明

| 依赖             | 版本    | 用途                           |
| ---------------- | ------- | ------------------------------ |
| `astro`          | 5.2.3   | 核心框架，静态站点生成         |
| `react`          | 19.0.0  | 交互组件开发                   |
| `tailwindcss`    | 4.0.0   | 原子化 CSS 框架                |
| `motion`         | 11.15.0 | 动画库（Framer Motion 后继者） |
| `nanostores`     | -       | 轻量级状态管理                 |
| `astro-pagefind` | -       | 静态全文搜索                   |
| `astro-icon`     | 1.1.5   | 图标系统（Iconify）            |

---

## 目录结构

```plain
astro-koharu/
├── public/                     # 静态资源（直接复制到构建目录）
│   ├── favicon.ico
│   ├── img/                    # 图片资源
│   │   ├── avatar.webp        # 头像
│   │   └── cover/             # 文章封面
│   └── js/                     # 第三方脚本
│
├── src/                        # 源代码
│   ├── assets/                 # 需要处理的资源
│   │   └── svg/               # SVG 文件
│   │
│   ├── components/             # 组件库（60+ 组件）
│   │   ├── common/            # 通用组件（ErrorBoundary）
│   │   ├── layout/            # 布局组件（Header, Navigator）
│   │   ├── ui/                # UI 基础组件（Button, Card, Popover）
│   │   ├── post/              # 文章相关组件
│   │   ├── category/          # 分类组件
│   │   ├── theme/             # 主题切换
│   │   ├── friends/           # 友链组件
│   │   └── comment/           # 评论组件
│   │
│   ├── content/                # Astro Content Collections
│   │   ├── config.ts          # Schema 定义
│   │   └── blog/              # 博客文章（183 篇）
│   │       ├── life/          # 随笔
│   │       ├── note/          # 笔记
│   │       │   ├── front-end/ # 前端笔记
│   │       │   └── ...
│   │       ├── weekly/        # 周刊
│   │       └── ...
│   │
│   ├── constants/              # 常量配置
│   │   ├── site-config.ts     # 站点配置（最重要）
│   │   ├── router.ts          # 导航路由
│   │   ├── design-tokens.ts   # 设计令牌
│   │   └── anim/              # 动画配置
│   │
│   ├── hooks/                  # React Hooks
│   │   ├── useToggle.ts
│   │   ├── useFloatingUI.ts
│   │   └── ...
│   │
│   ├── layouts/                # 页面布局
│   │   ├── Layout.astro       # 主布局
│   │   └── TwoColumnLayout.astro
│   │
│   ├── lib/                    # 工具函数
│   │   ├── content/           # 内容操作
│   │   │   ├── posts.ts       # 文章查询
│   │   │   ├── categories.ts  # 分类处理
│   │   │   └── tags.ts        # 标签处理
│   │   ├── utils.ts           # 通用工具
│   │   └── datetime.ts        # 日期处理
│   │
│   ├── pages/                  # 页面路由
│   │   ├── index.astro        # 首页
│   │   ├── post/[...slug].astro    # 文章详情
│   │   ├── posts/[...page].astro   # 文章列表
│   │   ├── categories/        # 分类页面
│   │   ├── tags/              # 标签页面
│   │   └── rss.xml.ts         # RSS 源
│   │
│   ├── store/                  # Nanostores 状态
│   │   ├── app.ts             # 应用状态
│   │   └── ui.ts              # UI 状态
│   │
│   ├── styles/                 # 全局样式
│   │   ├── index.css          # 入口
│   │   ├── global/            # 全局样式
│   │   ├── theme/             # 主题样式
│   │   └── components/        # 组件样式
│   │
│   └── types/                  # TypeScript 类型
│       ├── blog.ts
│       └── components.ts
│
├── astro.config.mjs            # Astro 配置
├── tailwind.config.mjs         # Tailwind 配置
├── tsconfig.json               # TypeScript 配置
├── package.json                # 依赖和脚本
├── _config.yml                 # Hexo 分类映射（遗留）
└── CLAUDE.md                   # AI 助手指南
```

---

## 快速开始

### 环境要求

- **Node.js**: 22.12.0 或更高版本
- **包管理器**: pnpm 10.28.2（项目指定）

### 安装与运行

```bash
# 1. 克隆项目
git clone <repo-url>
cd astro-koharu

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器
pnpm dev
# 访问 http://localhost:4321

# 4. 构建生产版本
pnpm build

# 5. 预览构建结果
pnpm preview
```

### 常用命令速查

| 命令               | 说明                   |
| ------------------ | ---------------------- |
| `pnpm dev`         | 启动开发服务器         |
| `pnpm build`       | 构建生产版本           |
| `pnpm preview`     | 预览生产构建           |
| `pnpm lint`        | 运行 ESLint 检查       |
| `pnpm lint-md`     | 检查 Markdown 文件     |
| `pnpm lint-md:fix` | 自动修复 Markdown 问题 |
| `pnpm knip`        | 查找未使用的代码和依赖 |
| `pnpm change`      | 生成 CHANGELOG         |

---

## 路径别名

项目配置了丰富的路径别名，简化导入路径：

```typescript
// tsconfig.json 中定义
import { cn } from '@lib/utils';           // src/lib/utils.ts
import { Button } from '@components/ui/button';  // src/components/ui/button.tsx
import { siteConfig } from '@constants/site-config';  // src/constants/site-config.ts
import type { BlogPost } from '@types/blog';  // src/types/blog.ts
```

| 别名            | 对应路径           |
| --------------- | ------------------ |
| `@/*`           | `src/*`            |
| `@components/*` | `src/components/*` |
| `@lib/*`        | `src/lib/*`        |
| `@constants/*`  | `src/constants/*`  |
| `@hooks/*`      | `src/hooks/*`      |
| `@store/*`      | `src/store/*`      |
| `@types/*`      | `src/types/*`      |
| `@layouts/*`    | `src/layouts/*`    |
| `@pages/*`      | `src/pages/*`      |
| `@content/*`    | `src/content/*`    |
| `@styles/*`     | `src/styles/*`     |
| `@assets/*`     | `src/assets/*`     |
| `@scripts/*`    | `src/scripts/*`    |

---

## 站点配置

站点的核心配置位于 `src/constants/site-config.ts`：

```typescript
export const siteConfig = {
  // 基本信息
  title: '余弦の博客',
  alternate: 'cosine',
  subtitle: 'WA 的一声就哭了',
  name: 'cos',
  description: 'FE / ACG / 手工 / 深色模式强迫症...',

  // 资源
  avatar: '/img/avatar.webp',
  site: 'https://blog.cosine.ren/',
  startYear: 2020,

  // 特色分类（首页展示）
  featuredCategories: [...],

  // 周刊专栏配置
  featuredSeries: {
    categoryName: '周刊',
    label: 'FE Bits',
    fullName: 'FE Bits 前端周周谈',
  },

  // 社交链接
  socialConfig: {
    github: '...',
    bilibili: '...',
    email: '...',
    twitter: '...',
    rss: '/rss.xml',
  }
};
```

---

## 页面路由概览

```plain
/                           # 首页（最新文章 + 置顶）
├── /posts/[page]           # 文章列表分页
├── /post/[slug]            # 文章详情页
├── /categories/            # 分类首页
│   └── /categories/[...slug]  # 分类页面（支持多级）
├── /tags/                  # 标签首页
│   └── /tags/[tag]         # 标签页面
├── /archives               # 归档页面
├── /weekly                 # 周刊专栏
├── /friends                # 友链页面
├── /about                  # 关于页面
└── /rss.xml                # RSS 订阅源
```

---

## 文档导航

本系列文档共 10 篇，建议按顺序阅读：

1. **[00-overview.md](./00-overview.md)**（当前） - 项目总览与快速开始
2. **[01-architecture.md](./01-architecture.md)** - 架构设计与技术栈
3. **[02-content-system.md](./02-content-system.md)** - 内容系统深度解析
4. **[03-routing.md](./03-routing.md)** - 路由系统详解
5. **[04-component-patterns.md](./04-component-patterns.md)** - 组件模式与最佳实践
6. **[05-ui-components.md](./05-ui-components.md)** - UI 组件库实现
7. **[06-state-management.md](./06-state-management.md)** - 状态管理（Nanostores）
8. **[07-theme-system.md](./07-theme-system.md)** - 主题系统实现
9. **[08-animation-system.md](./08-animation-system.md)** - 动画系统设计
10. **[09-styling.md](./09-styling.md)** - 样式系统（Tailwind + 设计令牌）

---

## 学习要点

- astro-koharu 是一个从 Hexo 迁移到 Astro 的现代化博客项目
- 采用 Astro Islands 架构，默认静态渲染，按需激活 React 组件
- 项目结构清晰，按功能模块化组织
- 使用 pnpm 作为包管理器，确保一致的依赖版本
- 路径别名简化了模块导入，提升开发体验

# 组件模式与最佳实践

## 组件类型选择

在 astro-koharu 中，组件分为两大类：**Astro 组件**和 **React 组件**。选择哪种类型取决于组件的功能需求。

### 选择指南

```plain
┌─────────────────────────────────────────────────────────────┐
│                     需要交互/状态吗？                        │
└─────────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
       否                      是
        │                       │
        ▼                       ▼
┌───────────────────┐   ┌───────────────────┐
│   Astro 组件      │   │   React 组件      │
│   (.astro)        │   │   (.tsx)          │
│                   │   │                   │
│ - 静态内容        │   │ - 交互功能        │
│ - 布局           │   │ - 状态管理        │
│ - SEO 元数据     │   │ - 动画           │
│ - 服务端数据获取  │   │ - 实时更新        │
└───────────────────┘   └───────────────────┘
```

### 实际对比

| 场景 | 组件类型 | 示例 |
|------|---------|------|
| 页面布局 | Astro | `Layout.astro` |
| 文章列表（静态） | Astro | `PostList.astro` |
| 导航菜单 | Astro + React | `Navigator.astro` + `DropdownNav.tsx` |
| 主题切换 | Astro（内联脚本） | `ThemeToggle.astro` |
| 搜索对话框 | React | `SearchDialog.tsx` |
| 侧边栏目录 | React | `TableOfContents.tsx` |
| 分页器 | Astro | `Paginator.astro` |

---

## 客户端指令详解

当 React 组件需要在 Astro 页面中使用时，必须添加 `client:*` 指令来激活 JavaScript。

### 指令类型

```astro
<!-- 页面加载时立即激活 -->
<ThemeToggle client:load />

<!-- 浏览器空闲时激活 -->
<MenuIcon client:idle />

<!-- 组件可见时激活 -->
<SearchDialog client:visible />

<!-- 媒体查询匹配时激活 -->
<MobileNav client:media="(max-width: 768px)" />

<!-- 仅客户端渲染（跳过 SSR） -->
<ClientOnlyComponent client:only="react" />
```

### 选择策略

```typescript
// 1. 关键交互 - 使用 client:load
// 用户需要立即使用的功能
<ThemeToggle client:load />
<Navigator client:load />

// 2. 非关键功能 - 使用 client:idle
// 可以延迟加载的功能
<MenuIcon client:idle />

// 3. 视口外内容 - 使用 client:visible
// 需要滚动才能看到的内容
<Comments client:visible />
<FooterLinks client:visible />

// 4. 依赖浏览器 API - 使用 client:only
// 无法在服务端渲染的组件
<WindowSizeDisplay client:only="react" />
```

### 在项目中的应用

```astro
<!-- src/components/layout/Header.astro -->
---
import { MenuIcon } from '@components/ui/MenuIcon';
import Navigator from './Navigator.astro';
---

<!-- 静态导航栏 -->
<Navigator transition:name="page-header" />

<!-- 移动端菜单按钮 - 需要交互 -->
<MenuIcon
  client:load
  className="tablet:flex fixed top-0 left-3 z-52 hidden"
  id="mobile-menu-container"
/>
```

---

## 组件通信模式

### 1. Props 传递（父 → 子）

最简单的通信方式，适用于简单的数据传递：

```astro
<!-- 父组件：PostPage.astro -->
---
const post = await getPost(slug);
---
<PostContent post={post} />
<SeriesNavigation client:load post={post} />

<!-- 子组件：SeriesNavigation.tsx -->
interface SeriesNavigationProps {
  post: BlogPost;
}

const SeriesNavigation = ({ post }: SeriesNavigationProps) => {
  // 使用 post 数据
};
```

### 2. Nanostores（全局状态）

跨 Astro/React 边界的状态共享：

```typescript
// src/store/ui.ts
import { atom } from 'nanostores';

export const drawerOpen = atom<boolean>(false);

export function toggleDrawer(): void {
  drawerOpen.set(!drawerOpen.get());
}
```

```tsx
// React 组件中使用
import { useStore } from '@nanostores/react';
import { drawerOpen, toggleDrawer } from '@store/ui';

const MenuIcon = () => {
  const isOpen = useStore(drawerOpen);

  return (
    <button onClick={toggleDrawer}>
      {isOpen ? 'Close' : 'Open'}
    </button>
  );
};
```

```astro
<!-- Astro 组件中监听 -->
<script>
  import { drawerOpen } from '@store/ui';

  drawerOpen.subscribe((isOpen) => {
    document.body.classList.toggle('drawer-open', isOpen);
  });
</script>
```

### 3. 自定义 Web Components

用于复杂的 Astro 组件内部状态管理：

```astro
<!-- src/components/layout/HomeSider.astro -->
<script>
  // 定义 Web Component
  class SiderContent extends HTMLElement {
    private infoContent: HTMLElement | null = null;
    private directoryContent: HTMLElement | null = null;

    connectedCallback() {
      this.infoContent = this.querySelector('[data-slot="info"]');
      this.directoryContent = this.querySelector('[data-slot="directory"]');
    }

    updateSlot(type: string) {
      this.infoContent?.classList.toggle('hidden', type !== 'INFO');
      this.directoryContent?.classList.toggle('hidden', type !== 'DIRECTORY');
    }
  }

  customElements.define('sider-content', SiderContent);
</script>

<sider-content>
  <div data-slot="info">...</div>
  <div data-slot="directory">...</div>
</sider-content>
```

---

## 错误边界设计

### 基础错误边界

用于捕获组件树中的 JavaScript 错误：

```tsx
// src/components/common/ErrorBoundary.tsx
'use client';

import { ErrorBoundary as ErrorBoundaryLib } from 'react-error-boundary';
import { Button } from '../ui/button';

const FallbackComponent = () => {
  return (
    <div className="flex-center-y w-full gap-2 py-6">
      Oops, Something wrong! Please contact to{' '}
      <a href="mailto:i@cosine.ren" className="text-blue-500">
        i@cosine.ren
      </a>
      or
      <Button onClick={() => window.location.reload()}>
        Reload Page
      </Button>
    </div>
  );
};

export const ErrorBoundary: FC<PropsWithChildren> = ({ children }) => {
  return (
    <ErrorBoundaryLib
      FallbackComponent={FallbackComponent}
      onError={(e) => console.error(e)}
    >
      {children}
    </ErrorBoundaryLib>
  );
};
```

### 浮动 UI 专用错误边界

针对 Popover、Tooltip 等浮动组件的错误处理：

```tsx
// src/components/common/FloatingErrorBoundary.tsx

/**
 * 浮动组件错误边界
 * 特点：错误时静默降级（渲染 null），不影响主内容
 */
class FloatingErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 开发环境打印错误
    if (process.env.NODE_ENV !== 'production') {
      console.error('FloatingErrorBoundary caught:', error, errorInfo);
    }
    // 生产环境可发送到 Sentry
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 浮动组件失败 → 静默返回 null
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

/**
 * HOC：快速包装组件
 */
export function withFloatingErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string,
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <FloatingErrorBoundary componentName={componentName}>
      <Component {...props} />
    </FloatingErrorBoundary>
  );

  WrappedComponent.displayName =
    `withFloatingErrorBoundary(${componentName || Component.name})`;

  return WrappedComponent;
}
```

### 使用示例

```tsx
// src/components/layout/DropdownNav.tsx

import { withFloatingErrorBoundary } from '@components/common/FloatingErrorBoundary';

const DropdownNavComponent = ({ item }: DropdownNavProps) => {
  // 组件实现...
};

// 1. 性能优化：memo 防止不必要的重渲染
const DropdownNav = memo(DropdownNavComponent);

// 2. 错误隔离：HOC 包装
const DropdownNavWithErrorBoundary = withFloatingErrorBoundary(
  DropdownNav,
  'DropdownNav'
);

export default DropdownNavWithErrorBoundary;
```

---

## 性能优化技巧

### 1. React.memo

防止不必要的重渲染：

```tsx
// 优化前
const DropdownNav = ({ item }: DropdownNavProps) => {
  // ...
};

// 优化后
const DropdownNavComponent = ({ item }: DropdownNavProps) => {
  // ...
};

const DropdownNav = memo(DropdownNavComponent);
```

### 2. useCallback

稳定函数引用：

```tsx
// 优化前：每次渲染创建新函数
const handleClick = () => {
  setIsOpen(!isOpen);
};

// 优化后：函数引用稳定
const handleClick = useCallback(() => {
  setIsOpen((prev) => !prev);
}, []);
```

### 3. 懒加载指令

```astro
<!-- 视口外组件延迟加载 -->
<Comments client:visible />

<!-- 空闲时加载非关键组件 -->
<Analytics client:idle />
```

### 4. 条件渲染优化

```astro
---
// 服务端条件渲染 - 不会产生额外 JS
const showSidebar = headings.length > 0;
---

{showSidebar && <TableOfContents client:visible headings={headings} />}
```

---

## 完整组件示例

### DropdownNav 组件分析

```tsx
// src/components/layout/DropdownNav.tsx

import { memo } from 'react';
import Popover from '@components/ui/popover';
import { type Router } from '@constants/router';
import { useToggle } from '@hooks/useToggle';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { withFloatingErrorBoundary } from '@components/common/FloatingErrorBoundary';

interface DropdownNavProps {
  item: Router;
  className?: string;
}

const DropdownNavComponent = ({ item, className }: DropdownNavProps) => {
  // 1. 使用自定义 Hook 管理开关状态
  const { isOpen, setIsOpen } = useToggle({ defaultOpen: false });
  const { name, icon, children } = item;

  return (
    // 2. 使用 Popover 组件实现下拉效果
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom-start"
      trigger="hover"
      render={() => (
        // 3. 下拉菜单内容
        <div className="nav-dropdown flex flex-col items-center">
          {children?.map((child: Router, index) => (
            <a
              key={child.path}
              href={child.path}
              className={cn(
                'hover:bg-gradient-shoka-button px-4 py-2 transition-colors',
                {
                  // 4. 动态圆角
                  'rounded-ss-2xl': index === 0,
                  'rounded-ee-2xl': index === children.length - 1,
                  // 5. 当前路由高亮
                  'bg-gradient-shoka-button': window.location.pathname === child.path,
                },
              )}
            >
              {child.icon && <Icon icon={child.icon} />}
              {child.name}
            </a>
          ))}
        </div>
      )}
    >
      {/* 6. 触发按钮 */}
      <button
        className={cn('inline-flex items-center px-4 py-2', className)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`${name}菜单`}
      >
        {icon && <Icon icon={icon} />}
        {name}
        {/* 7. 箭头旋转动画 */}
        <Icon
          icon="ri:arrow-drop-down-fill"
          className={cn('transition-transform', {
            'rotate-180': isOpen,
          })}
        />
      </button>
    </Popover>
  );
};

// 8. 性能优化：memo
const DropdownNav = memo(DropdownNavComponent);

// 9. 错误隔离：HOC
const DropdownNavWithErrorBoundary = withFloatingErrorBoundary(
  DropdownNav,
  'DropdownNav'
);

export default DropdownNavWithErrorBoundary;
```

### 关键设计点

1. **状态管理**：使用 `useToggle` 自定义 Hook
2. **复合组件**：Popover + 触发器 + 内容
3. **样式组合**：`cn()` 函数合并 Tailwind 类
4. **无障碍**：ARIA 属性支持
5. **动画**：CSS transition 实现箭头旋转
6. **性能**：memo 防止重渲染
7. **错误处理**：HOC 包装错误边界

---

## 组件组织结构

```plain
src/components/
├── common/              # 通用工具组件
│   ├── ErrorBoundary.tsx
│   └── FloatingErrorBoundary.tsx
│
├── layout/              # 布局组件
│   ├── Header.astro         # 静态头部
│   ├── Navigator.astro      # 导航容器
│   ├── DropdownNav.tsx      # 下拉导航（交互）
│   ├── HomeSider.astro      # 侧边栏
│   └── MobileDrawer.astro   # 移动端抽屉
│
├── ui/                  # 基础 UI 组件
│   ├── button.tsx
│   ├── popover.tsx
│   ├── card.tsx
│   └── ...
│
├── post/                # 文章相关
│   ├── PostList.astro       # 静态列表
│   ├── PostItemCard.astro   # 静态卡片
│   └── SeriesNavigation.tsx # 系列导航（交互）
│
└── theme/               # 主题组件
    └── ThemeToggle.astro
```

---

## 学习要点

1. **组件类型选择**：
   - 静态内容 → Astro 组件
   - 交互功能 → React 组件
2. **客户端指令**：
   - `client:load` - 关键交互
   - `client:idle` - 非关键功能
   - `client:visible` - 懒加载
3. **通信模式**：
   - Props - 简单数据传递
   - Nanostores - 跨组件状态
   - Web Components - 复杂 Astro 内部状态
4. **错误处理**：
   - ErrorBoundary - 通用错误捕获
   - FloatingErrorBoundary - 浮动 UI 静默降级
5. **性能优化**：
   - `memo()` - 防止重渲染
   - `useCallback()` - 稳定函数引用
   - 客户端指令 - 控制 JS 加载时机

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `src/components/common/ErrorBoundary.tsx` | 通用错误边界 |
| `src/components/common/FloatingErrorBoundary.tsx` | 浮动 UI 错误边界 |
| `src/components/layout/Header.astro` | 页头组件 |
| `src/components/layout/DropdownNav.tsx` | 下拉导航 |
| `src/components/layout/Navigator.astro` | 导航容器 |
| `src/store/ui.ts` | UI 状态管理 |
| `src/hooks/useToggle.ts` | 开关状态 Hook |

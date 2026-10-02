# 动画系统设计

## 概述

astro-koharu 使用 **Motion**（Framer Motion 的继任者）作为动画库，结合设计令牌系统提供一致的动画体验。

## 减弱动画与性能

有效偏好为「系统减弱动画 **或** 站内减弱动画」。系统偏好通过浏览器原生
`matchMedia('(prefers-reduced-motion: reduce)')` 读取并监听 `change`，不会写入用户的站内偏好。
`BootScripts.astro` 在首屏和 Astro 换页时同步 `html.motion-off`，CSS media query 同时提供无 JS 兜底。

- React 组件使用 `useMotionLevel()`（返回 `reduced` 时禁用）；SSR 和 hydration 先显示静态内容。
- 非 React 增强使用 `isMotionDisabled()` 和 `subscribeMotionLevel()`；滚动使用 `getScrollBehavior()`。
- `LazyMotionProvider` 提供默认即时过渡，组件显式指定的 `transition`、variants 和属性级 transition 仍须自行分支。
  当前 Motion 11 会在挂载时快照其内置减弱动画选项，并忽略目标不变的 transition 更新。动态偏好由共享 hook 管理，
  延迟加载的 motionFeatures 同时完成进行中的值和布局动画，避免重挂载丢失焦点或状态。
- 减弱动画时取消循环装饰、弹簧、Canvas 和延时入场；用户主动缩放、旋转、展开等操作保留即时最终状态。
- CSS 使用极短 duration 保留 tooltip 等组件依赖的完成事件；不可全局删除 transform，它也承担布局和翻面功能。
- 第三方 spoiler 在减弱动画或隐藏页面时替换为静态可揭示内容，断连后释放 Canvas 和 RAF。嵌套富文本、键盘焦点和已揭示状态均须保留。
- 雪花在减弱动画、关闭特效或隐藏页面时不渲染；正常模式限制实际 drawing buffer 和绘制频率。

定向浏览器回归覆盖桌面和移动端，使用开发服务以挂载隔离的组件 fixture，不修改站点配置：

```sh
pnpm exec astro dev --host 127.0.0.1 --port 4339
pnpm exec playwright test -c tests/motion/playwright.config.ts
```

可用 `MOTION_BASE_URL` 指向已运行的开发服务。CPU 限速与绘制计数验证的是行为和工作量上限，不代替真实低端设备的帧率测试。

### 动画层次

```plain
┌─────────────────────────────────────────────────────────────┐
│                      动画系统架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   设计令牌层 (design-tokens.ts)                              │
│   ├── duration - 持续时间                                   │
│   ├── easing - 缓动函数                                     │
│   └── spring - Spring 配置                                  │
│              │                                              │
│              ▼                                              │
│   预设层 (anim/spring.ts)                                   │
│   ├── microDampingPreset                                   │
│   └── microReboundPreset                                   │
│              │                                              │
│              ▼                                              │
│   组件层                                                     │
│   ├── MenuIcon - 菜单图标动画                                │
│   ├── Popover - 弹出框动画                                   │
│   └── FlippedCard - 翻转卡片动画                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Motion 库基础

### 什么是 Motion？

Motion 是 Framer Motion 的继任者，提供声明式动画 API：

```tsx
import { motion } from 'motion/react';

// 基础动画
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
/>

// 使用 variants
const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

<motion.div
  variants={variants}
  initial="hidden"
  animate="visible"
/>
```

### 核心概念

| 概念 | 说明 |
|------|------|
| `motion.div` | 可动画的 DOM 元素 |
| `initial` | 初始状态 |
| `animate` | 目标状态 |
| `exit` | 退出状态（需要 AnimatePresence） |
| `transition` | 过渡配置 |
| `variants` | 命名状态集合 |
| `whileHover` | 悬停状态 |
| `whileTap` | 点击状态 |

---

## 设计令牌中的动画配置

### `src/constants/design-tokens.ts`

```typescript
export const animation = {
  // 持续时间（毫秒）
  duration: {
    fast: 150,      // 快速反馈
    tween: 200,     // 过渡
    normal: 250,    // 标准动画
    ui: 300,        // UI 交互
    slow: 350,      // 慢速动画
    slower: 500,    // 更慢
    flipCard: 600,  // 卡片翻转
  },

  // CSS 缓动函数
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // 弹性效果
  },

  // Motion Spring 配置
  spring: {
    // 默认 Spring（平衡）
    default: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },

    // 柔和 Spring（平滑）
    gentle: {
      type: 'spring',
      stiffness: 200,
      damping: 25,
    },

    // 弹性 Spring（有弹跳）
    wobbly: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },

    // 刚性 Spring（快速响应）
    stiff: {
      type: 'spring',
      stiffness: 500,
      damping: 35,
    },

    // 慢速 Spring（放松）
    slow: {
      type: 'spring',
      stiffness: 150,
      damping: 20,
    },

    // 微动画预设
    microDamping: {
      type: 'spring',
      stiffness: 200,
      damping: 13,
    },

    microRebound: {
      type: 'spring',
      stiffness: 200,
      damping: 9,
    },

    // 组件专用
    menu: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },

    popoverContent: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },

  // CSS transition 字符串
  transition: {
    fast: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};
```

### Spring 参数说明

```plain
                    Spring 物理模型

                    ┌─────────┐
                    │  质量   │
                    └────┬────┘
                         │
                    ╭────┴────╮
                    │  弹簧   │ ← stiffness（刚度）
                    │  ~~~~   │   值越大，回弹越快
                    ╰────┬────╯
                         │
                    ┌────┴────┐
                    │ 阻尼器  │ ← damping（阻尼）
                    │  ≋≋≋≋  │   值越大，震荡越少
                    └─────────┘

stiffness = 300, damping = 30  →  平衡的弹性动画
stiffness = 500, damping = 35  →  快速响应，少弹跳
stiffness = 400, damping = 20  →  有弹跳的动画
```

---

## 常见动画模式

### 1. 菜单图标动画 (MenuIcon)

三条线变成 X 的动画：

```tsx
// src/components/ui/MenuIcon.tsx

const lineVariants: Variants = {
  closed: {
    rotate: 0,
    y: 0,
    opacity: 1,
  },
  opened: (lineIndex: number) => {
    switch (lineIndex) {
      case 1:
        // 第一条线：旋转 45°，向下移动
        return {
          rotate: 45,
          y: 6,
          opacity: 1,
          transition: animation.spring.menu,
        };
      case 2:
        // 第二条线：消失
        return {
          rotate: 0,
          y: 0,
          opacity: 0,
          transition: animation.spring.menu,
        };
      case 3:
        // 第三条线：旋转 -45°，向上移动
        return {
          rotate: -45,
          y: -6,
          opacity: 1,
          transition: animation.spring.menu,
        };
    }
  },
};

// 使用 useAnimation 控制
const controls = useAnimation();

useEffect(() => {
  controls.start(isOpen ? 'opened' : 'closed');
}, [isOpen, controls]);

// SVG 中使用
<motion.g variants={lineVariants} animate={controls} custom={1}>
  <line x1="3" y1="6" x2="21" y2="6" />
</motion.g>
```

**动画效果**：

```plain
关闭状态（三条横线）          打开状态（X）
    ─────────                    ╲
    ─────────         →          ╱
    ─────────
```

### 2. 弹出框动画 (Popover)

```tsx
// src/components/ui/popover.tsx

<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1, originY: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={animation.spring.popoverContent}
    >
      {content}
    </motion.div>
  )}
</AnimatePresence>
```

**动画效果**：

```plain
进入动画：
opacity: 0 → 1
scale: 0.85 → 1

退出动画：
opacity: 1 → 0
scale: 1 → 0.85
```

### 3. 翻转卡片动画

```tsx
// 使用 CSS 3D 变换
const flipCardStyle = {
  perspective: '1000px',
};

const cardFrontStyle = {
  backfaceVisibility: 'hidden',
  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
  transition: `transform ${animation.duration.flipCard}ms ${animation.easing.easeInOut}`,
};

const cardBackStyle = {
  backfaceVisibility: 'hidden',
  transform: isFlipped ? 'rotateY(0)' : 'rotateY(-180deg)',
  transition: `transform ${animation.duration.flipCard}ms ${animation.easing.easeInOut}`,
};
```

### 4. 悬停和点击效果

```tsx
// 通用可点击元素动画
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
  Click me
</motion.button>
```

---

## AnimatePresence 使用

### 什么是 AnimatePresence？

`AnimatePresence` 允许组件在从 React 树中移除时执行退出动画：

```tsx
import { AnimatePresence, motion } from 'motion/react';

function Modal({ isOpen }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}  // 退出时执行
        >
          Modal content
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 在项目中的应用

```tsx
// Popover 组件
<AnimatePresence>
  {isOpen && (
    <FloatingPortal>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
      >
        {content}
      </motion.div>
    </FloatingPortal>
  )}
</AnimatePresence>
```

---

## Variants 模式

### 定义 Variants

```tsx
const containerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,  // 子元素依次出现
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};
```

### 使用 Variants

```tsx
<motion.ul
  variants={containerVariants}
  initial="hidden"
  animate="visible"
>
  {items.map((item) => (
    <motion.li key={item.id} variants={itemVariants}>
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

### Custom 参数

用于为每个子元素传递不同参数：

```tsx
// 定义时使用函数
const lineVariants: Variants = {
  opened: (lineIndex: number) => ({
    rotate: lineIndex === 1 ? 45 : -45,
    y: lineIndex === 1 ? 6 : -6,
  }),
};

// 使用时传递 custom
<motion.g variants={lineVariants} custom={1}>...</motion.g>
<motion.g variants={lineVariants} custom={2}>...</motion.g>
<motion.g variants={lineVariants} custom={3}>...</motion.g>
```

---

## useAnimation Hook

### 手动控制动画

```tsx
import { useAnimation } from 'motion/react';

function Component() {
  const controls = useAnimation();

  // 响应状态变化
  useEffect(() => {
    controls.start(isOpen ? 'opened' : 'closed');
  }, [isOpen, controls]);

  // 手动触发
  const handleClick = async () => {
    await controls.start('hover');
    await controls.start('normal');
  };

  return (
    <motion.div animate={controls} variants={variants}>
      ...
    </motion.div>
  );
}
```

---

## CSS 动画与 Motion 的选择

### 何时使用 CSS 动画

```css
/* 简单的状态过渡 */
.button {
  transition: transform 0.2s ease-out, background-color 0.2s ease-out;
}

.button:hover {
  transform: translateY(-2px);
  background-color: var(--primary-hover);
}
```

适用场景：
- 简单的 hover 效果
- 颜色/透明度过渡
- 不需要 JavaScript 控制

### 何时使用 Motion

```tsx
// 复杂的序列动画
<motion.div
  initial={{ opacity: 0, y: 50 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -50 }}
  transition={{ duration: 0.3 }}
/>
```

适用场景：
- 需要退出动画
- 复杂的序列/交错动画
- 需要 JavaScript 控制
- 布局动画（LayoutGroup）
- 手势驱动动画

### 项目中的选择

| 场景 | 选择 | 原因 |
|------|------|------|
| 按钮 hover | CSS | 简单过渡 |
| 菜单图标 | Motion | 复杂的路径变换 |
| Popover | Motion | 需要 exit 动画 |
| 链接悬停 | CSS | 简单高亮 |
| 卡片翻转 | CSS | 3D 变换 |
| 列表过渡 | Motion | stagger 效果 |

---

## 无障碍考虑

### prefers-reduced-motion

```tsx
import { useReducedMotion } from 'motion/react';

function Component() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ x: shouldReduceMotion ? 0 : 100 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
      }}
    />
  );
}
```

### CSS 媒体查询

```css
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 学习要点

1. **Motion 基础**：`motion.div`、`initial`、`animate`、`exit`
2. **Spring 动画**：理解 `stiffness` 和 `damping` 参数
3. **设计令牌**：统一管理动画配置
4. **Variants**：命名状态集合，支持 `staggerChildren`
5. **AnimatePresence**：支持退出动画
6. **useAnimation**：手动控制动画
7. **无障碍**：使用 `useReducedMotion` 或 CSS 媒体查询

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `src/constants/design-tokens.ts` | 动画设计令牌 |
| `src/constants/anim/spring.ts` | Spring 预设 |
| `src/components/ui/MenuIcon.tsx` | 菜单图标动画 |
| `src/components/ui/popover.tsx` | 弹出框动画 |
| `src/components/post/FlippedCard.astro` | 翻转卡片 |

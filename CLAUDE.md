<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

astro-koharu is an Astro-based blog rebuilt from Hexo, inspired by the Shoka theme. It uses React for interactive components, Tailwind CSS for styling, and maintains compatibility with legacy Hexo blog content.

## Development Commands

Package manager: **pnpm** (specified in package.json: `pnpm@9.15.1`)

```bash
# Development
pnpm dev              # Start dev server at http://localhost:4321

# Build & Preview
pnpm build            # Build for production (runs astro build + pagefind)
pnpm preview          # Preview production build

# Type Checking
pnpm check            # Run Astro type checking (astro check)

# Content Generation (optional features)
pnpm generate:lqips           # Generate LQIP (low-quality image placeholders) for blog images
pnpm generate:similarities    # Generate semantic similarity vectors for related posts
pnpm generate:summaries       # Generate AI summaries for posts (incremental)
pnpm generate:summaries:force # Force regenerate all summaries

# Linting & Code Quality
pnpm lint             # Run Biome linter and formatter check
pnpm lint:fix         # Auto-fix linting and formatting issues
pnpm format           # Format all files with Biome
pnpm lint-md          # Lint markdown files in src/content (Chinese standards)
pnpm lint-md:fix      # Auto-fix markdown issues
pnpm knip             # Find unused files, dependencies, and exports

# Git & Changelog
pnpm change           # Generate CHANGELOG.md using git-cliff
```

## Architecture

### Tech Stack

- **Framework**: Astro 5.x with React integration
- **Styling**: Tailwind CSS 4.x with plugins (typography, container-queries, animate)
- **Content**: Astro Content Collections (blog posts in `src/content/blog/`)
- **Icons**: astro-icon with Iconify icon sets (ri, fa6-solid, fa6-regular, gg)
- **Animations**: Motion (Framer Motion successor)
- **State**: Nanostores for lightweight state management
- **Search**: Pagefind for static site search (no backend required)
- **Utilities**: es-toolkit, dayjs, sanitize-html

### Project Structure

```plain
src/
├── components/       # React & Astro components
│   ├── common/      # ErrorBoundary, etc.
│   ├── ui/          # Reusable UI components (shadcn-style)
│   ├── layout/      # Header, Navigator, HomeSider, etc.
│   ├── post/        # Post-related components
│   ├── category/    # Category navigation
│   └── theme/       # Theme toggle
├── content/
│   └── blog/        # Markdown/MDX blog posts (Content Collections)
├── layouts/         # Page layouts
├── pages/           # File-based routing
├── lib/             # Utility functions (content, datetime, route, etc.)
├── hooks/           # React hooks
├── constants/       # Site config, router, categories, animations
├── scripts/         # Build-time scripts
└── styles/          # Global CSS
```

### Key Architectural Concepts

#### Content System

- **Blog Posts**: Defined in `src/content/blog/` using Astro Content Collections
- **Schema**: See `src/content/config.ts` for the blog post schema (title, date, cover, tags, categories, etc.)
- **Categories**: Hierarchical structure supporting both single category (`'工具'`) and nested categories (`['笔记', '前端', 'React']`)
- **Legacy Compatibility**: Migrated from Hexo, maintains compatibility with old frontmatter fields (subtitle, catalog, categories array format)

#### Category System

- **Category Mapping**: Chinese category names map to URL-friendly slugs via `_config.yml` (legacy Hexo config)
  - Example: `'随笔': 'life'`, `'前端': 'front-end'`
- **Transform Script**: `src/scripts/transformShokaConfig.ts` reads `_config.yml` and provides category mappings
- **Category Utils**: `src/lib/content.ts` has extensive category manipulation functions:
  - `getCategoryList()`: Build hierarchical category tree from all posts
  - `getCategoryByLink()`: Find category by URL slug
  - `getPostsByCategory()`: Filter posts by category
  - `getPostLastCategory()`: Get the deepest category for a post

#### Path Aliases

Configured in `tsconfig.json`:

```plain
@/          → src/
@assets/*   → src/assets/*
@components/* → src/components/*
@content/*  → src/content/*
@layouts/*  → src/layouts/*
@pages/*    → src/pages/*
@styles/*   → src/styles/*
@lib/*      → src/lib/*
@constants/* → src/constants/*
@hooks/*    → src/hooks/*
@store/*    → src/store/*
@scripts/*  → src/scripts/*
@types/*    → src/types/*
```

#### Configuration Files

- **Site Config**: `src/constants/site-config.ts` - site metadata, social links, featured categories
- **Router**: `src/constants/router.ts` - navigation structure
- **Astro Config**: `astro.config.mjs` - markdown settings (GFM, rehype plugins for heading IDs/anchors), integrations (React, icons, Umami analytics)

#### Theme System

- Dark/light theme toggle with localStorage persistence
- Theme check runs inline in `<head>` to prevent flash of unstyled content (FOUC)
- Theme state persists across Astro page transitions via `astro:page-load` event

#### Markdown Processing

- **Syntax Highlighting**: Shiki with `github-light`/`github-dark` themes
- **Heading Links**: Auto-generated IDs via `rehype-slug`, auto-linked via `rehype-autolink-headings`
- **Reading Time**: Calculated using `reading-time` package
- **GFM Support**: GitHub Flavored Markdown enabled

#### RSS Feed

- Generated at `/rss.xml` via `src/pages/rss.xml.ts`
- Uses `@astrojs/rss` integration

### Component Patterns

#### UI Components

- Follow shadcn/ui patterns with Radix UI primitives
- Use `class-variance-authority` (cva) for component variants
- Tailwind classes merged via `tailwind-merge` in `src/lib/utils.ts`

#### Astro vs React

- **Astro components** (`.astro`): For layouts, pages, server-rendered content
- **React components** (`.tsx`): For interactive UI (navigation dropdowns, theme toggle, segmented controls)
- **Client directives**: Use `client:load`, `client:visible`, etc. for React components that need JavaScript

#### Astro Script Initialization

When writing `<script>` in Astro components that need DOM access, **always handle the initialization race condition**:

```typescript
// ❌ Bad: May miss the event if script loads after astro:page-load fires
document.addEventListener('astro:page-load', init);

// ✅ Good: Initialize immediately if DOM ready, also listen for subsequent navigations
if (document.readyState !== 'loading') {
  init();
}
document.addEventListener('astro:page-load', init);
```

For components with cleanup needs, use an `initialized` flag or `controller?.destroy()` pattern to prevent double initialization.

**Event listener and Observer cleanup pattern:**

```typescript
let scrollHandler = null;
let themeObserver = null;

function init() {
  // 清理旧的监听器（防止重复绑定）
  if (scrollHandler) window.removeEventListener('scroll', scrollHandler);
  if (themeObserver) themeObserver.disconnect();

  // 创建新的监听器
  scrollHandler = throttle(handleScroll, 80);
  window.addEventListener('scroll', scrollHandler, { passive: true });

  themeObserver = new MutationObserver(handleThemeChange);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

// 首次加载
if (document.readyState !== 'loading') init();
document.addEventListener('astro:page-load', init);

// 页面切换前清理（防止内存泄漏）
document.addEventListener('astro:before-swap', () => {
  if (scrollHandler) { window.removeEventListener('scroll', scrollHandler); scrollHandler = null; }
  if (themeObserver) { themeObserver.disconnect(); themeObserver = null; }
});
```

## Code Style

Biome handles both linting and formatting (line width: 128, single quotes, trailing commas). Tailwind classes must be sorted (`useSortedClasses` rule enforced).

- Avoid code duplication - extract common types and components.
- Keep components focused - use hooks and component composition.
- Follow React best practices - proper Context usage, state management.
- Use TypeScript strictly - leverage type safety throughout.
- Build React features out of small, atomic components. Push data fetching, stores, and providers down to the feature or tab that actually needs them so switching views unmounts unused logic and prevents runaway updates instead of centralizing everything in a mega component.

### React Best Practices

#### Avoid useCallback Overuse

Only use `useCallback` when:

- The callback is passed to a memoized child component
- The callback has dependencies that genuinely need to be tracked

**DON'T** wrap callbacks with empty dependencies or callbacks that aren't passed to memoized components:

```typescript
// ❌ Bad: Unnecessary useCallback
const handleClose = useCallback(() => {
  window.api.mainPanel.close();
}, []);

// ✅ Good: Regular function
const handleClose = () => {
  window.api.mainPanel.close();
};
```

#### Fix Circular Dependencies in useEffect

When event handlers need to access latest state without re-subscribing, use refs:

```typescript
// ❌ Bad: Circular dependency causes re-subscription every state change
const handleMouseMove = useCallback((e: MouseEvent) => {
  if (!isDragging) return;
  // ... logic
}, [isDragging]);

useEffect(() => {
  if (isDragging) {
    window.addEventListener('mousemove', handleMouseMove);
  }
  return () => window.removeEventListener('mousemove', handleMouseMove);
}, [isDragging, handleMouseMove]); // Circular dependency!

// ✅ Good: Use ref and define handler inside effect
const isDraggingRef = useRef(isDragging);
isDraggingRef.current = isDragging;

useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    // ... logic
  };

  if (isDragging) {
    window.addEventListener('mousemove', handleMouseMove);
  }
  return () => window.removeEventListener('mousemove', handleMouseMove);
}, [isDragging]); // No circular dependency
```

#### Avoid useState for Static Values

Don't use `useState` for values that never change:

```typescript
// ❌ Bad: useState for static value
const [siteTitle] = useState('astro-koharu');

// ✅ Good: Direct constant or useMemo for computed values
const siteTitle = 'astro-koharu';
// OR for computed values:
const computedValue = useMemo(() => expensiveComputation(), []);
```

#### Extract Custom Hooks for Reusable Logic

When the same `useState` + `useRef` + `useEffect` pattern appears 2+ times, extract it into a custom hook:

**Signs you need a custom hook:**

- Same state management pattern repeated across components
- Logic involves event listeners with cleanup
- State synchronization with refs (e.g., `scrollYRef.current = scrollY`)

**Example: Reusable hooks in this project**

```typescript
// See existing hooks in src/hooks/:
// - useMediaQuery.ts: Media query detection
// - useCurrentHeading.ts: Track scroll position and active heading
// - useActiveHeading.ts: Heading active state for TOC
// - useToggle.ts: Boolean state toggle
// - useIsDarkTheme.ts: Theme detection
```

**Hook naming conventions:**

- `use` prefix (required by React)
- Descriptive name: `useMediaQuery`, `useToggle`, `useActiveHeading`
- Return values or object with clear properties

#### Scroll Event Subscription in React

When subscribing to scroll events in React components, **use `useSyncExternalStore`** instead of `useState` + `useEffect` to avoid excessive re-renders:

```typescript
// ❌ Bad: Causes re-render on every scroll event
function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY); // Re-render every time!
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return scrollY;
}

// ✅ Good: Only re-renders when snapshot value changes
function createScrollStore() {
  let scrollY = 0;
  let listeners = new Set<() => void>();

  const handleScroll = () => {
    const newScrollY = window.scrollY;
    if (scrollY !== newScrollY) {
      scrollY = newScrollY;
      listeners.forEach(l => l());
    }
  };

  return {
    subscribe: (listener: () => void) => {
      if (listeners.size === 0) {
        window.addEventListener('scroll', handleScroll, { passive: true });
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener('scroll', handleScroll);
        }
      };
    },
    getSnapshot: () => scrollY,
    getServerSnapshot: () => 0,
  };
}

function useScrollPosition() {
  const store = useMemo(() => createScrollStore(), []);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
```

Key benefits:

- Only triggers re-render when the tracked value actually changes
- Properly handles React concurrent mode and SSR
- Automatic cleanup when no components are subscribed
- See `src/hooks/useCurrentHeading.ts` for a real-world example

#### Media Query Hooks

Use the existing `useMediaQuery` hook from `@hooks/useMediaQuery` instead of creating custom media query detection:

```typescript
// ❌ Bad: Custom media query detection
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const mql = window.matchMedia('(max-width: 768px)');
  setIsMobile(mql.matches);
  // ...
}, []);

// ✅ Good: Use existing hooks
import { useIsMobile, useMediaQuery } from '@hooks/useMediaQuery';

function Component() {
  const isMobile = useIsMobile();
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
}
```

Available hooks in `src/hooks/useMediaQuery.ts`:
- `useMediaQuery(query)` - Generic media query hook
- `useIsMobile()` - `(max-width: 768px)`
- `useIsTablet()` - `(max-width: 992px)`
- `usePrefersColorSchemeDark()` - Dark mode preference
- `usePrefersReducedMotion()` - Reduced motion preference

#### Use Motion's useReducedMotion for Animations

For animation-related components, prefer Motion's `useReducedMotion` hook over the generic `usePrefersReducedMotion`:

```typescript
// For animation components using Motion library
import { useReducedMotion } from 'motion/react';

function AnimatedComponent() {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return null; // or static version
  }
  return <AnimatedVersion />;
}

// For non-Motion components, use the existing hook
import { usePrefersReducedMotion } from '@hooks/useMediaQuery';
```

Benefits of Motion's hook for animations:
- Consistent with Motion library patterns
- Better integration with Motion's animation system
- See `src/components/christmas/SnowfallCanvas.tsx` for example

#### Error Handling

- `ErrorBoundary` component wraps interactive sections
- Uses `react-error-boundary` library
- See `src/components/common/ErrorBoundary.tsx` for implementation

#### SSR Hydration Mismatch (IMPORTANT)

When React components have client-only values (localStorage, nanostores with persistence, window-dependent state), **NEVER use `suppressHydrationWarning`** - this only hides the problem without fixing it.

**Use `useIsMounted` hook to defer client-only values:**

```typescript
// ❌ Bad: suppressHydrationWarning hides the mismatch but doesn't fix it
<div suppressHydrationWarning className={cn({ 'z-5': christmasEnabled.get() })} />

// ❌ Bad: Direct store access causes mismatch (server default vs client localStorage)
const isEnabled = useStore(christmasEnabled);
<div className={cn({ 'z-5': isEnabled })} />

// ✅ Good: Use useIsMounted to ensure SSR and initial hydration match
import { useIsMounted } from '@hooks/useIsMounted';

const isMounted = useIsMounted();
const isEnabled = useStore(christmasEnabled);
<div className={cn({ 'z-5': isMounted && isEnabled })} />
```

**Why this works:**
1. Server renders with `isMounted = false` → class not applied
2. Client hydrates with `isMounted = false` → matches server HTML ✓
3. After hydration, `useEffect` sets `isMounted = true` → class applied
4. No hydration mismatch, no console warnings

**When to use `useIsMounted`:**
- Conditional classes based on localStorage/nanostores
- Rendering content that depends on `window` or `document`
- Any value that differs between server and client

See `src/hooks/useIsMounted.ts` for implementation and `src/components/friends/FriendCard.tsx` for example usage.

## Component Patterns & Architecture

### Animation System

- **Motion library**: Successor to Framer Motion
- Animation constants in `src/constants/anim/`:
  - `spring.ts`: Spring configurations
  - `variants.ts`: Motion variants
  - `props.ts`: Reusable motion props

### Linting & Formatting

- **Biome**: All-in-one linter and formatter (replaced ESLint + Prettier)
  - Configuration: `biome.json`
  - Line width: 128, spaces (2), single quotes, trailing commas
  - `useSortedClasses` rule enforces Tailwind class sorting
  - Supports JS/TS/JSX/TSX/JSON and Astro frontmatter
- **Markdown**: `@lint-md/cli` for Chinese markdown linting (separate from Biome)
- **Lint-staged**: Pre-commit hooks run Biome on staged files via Husky

### Special Notes

- **Trailing Slashes**: Configured to `ignore` in `astro.config.mjs`
- **SVG Handling**: `vite-plugin-svgr` allows importing SVGs as React components
- **Umami Analytics**: Integrated for usage tracking (see `astro.config.mjs`)
- **Content Migration**: This blog was migrated from Hexo, so some posts may have legacy metadata fields
- **Conditional Bundling**: Large dependencies should be conditionally bundled to avoid unnecessary bundle size. Use Vite virtual modules or dynamic imports to exclude heavy libraries when their features are disabled. Example: Three.js (~879KB) for snowfall is only bundled when `christmasConfig.enabled && christmasConfig.features.snowfall` is true (see `conditionalSnowfall()` plugin in `astro.config.mjs`)

## IMPORTANT Guidelines

- **No backwards compatibility shims**: Avoid feature flags and backwards-compatibility hacks. Directly modify code since this is an active project.
- **Documentation lookup**: When you need to check official documentation, use Context7 MCP server to get the latest information, or use WebSearch if needed.
- **Keep CLAUDE.md updated**: When making major changes involving architectural alterations, ask to update CLAUDE.md at the end.

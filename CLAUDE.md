# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

astro-koharu is an Astro-based blog rebuilt from Hexo, inspired by the Shoka theme. It uses React for interactive components, Tailwind CSS for styling, and maintains compatibility with legacy Hexo blog content.

## Core Engineering Principles

### 1. Module-First Principle
**Every feature must be implemented as a standalone module with clear boundaries.**
- Logic organized into focused, single-responsibility modules
- Module structure: `src/lib/` (utilities), `src/hooks/` (React hooks), `src/components/` (UI), `src/store/` (state), `src/constants/` (config)

### 2. Interface-First Design
**Modules must expose clear, minimal public APIs.**
- Use barrel exports (`index.ts`) to define public interfaces
- Export TypeScript types alongside implementations
- Document complex functions with JSDoc

### 3. Functional-First Approach
**Prefer pure functions over stateful classes; manage side effects explicitly.**
- Write pure functions (same input → same output)
- Isolate side effects at boundaries
- Immutable data transformations using es-toolkit

### 4. Test-Friendly Architecture
**Design code to be testable without mocking.**
- Pure functions are naturally testable
- Testing priorities: High (lib utilities, data transformations) > Medium (hooks, state) > Low (UI components)

### 5. Simplicity & Anti-Abstraction
**Resist premature abstraction; three instances before extracting a pattern.**
- Don't create abstractions for single-use cases
- Maximum 3 levels of module nesting

### 6. Dependency Hygiene
**Manage dependencies carefully; avoid circular imports and bloat.**
- Use dynamic imports for heavy dependencies (>100KB)
- Conditional bundling for optional features
- No circular dependencies

## IMPORTANT Guidelines

- **Documentation lookup**: Use Context7 MCP server or WebSearch for official docs
- **Keep CLAUDE.md updated**: Ask to update when making architectural changes
- **Run lint before completion**: `pnpm lint:fix` must pass before completing tasks
- **Check for dead code**: Run `pnpm knip` periodically

## Development Commands

Package manager: **pnpm** (`pnpm@9.15.1`)

```bash
# Development
pnpm dev              # Start dev server at http://localhost:4321
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm check            # Run Astro type checking

# Linting & Code Quality
pnpm lint             # Run Biome linter and formatter
pnpm lint:fix         # Auto-fix linting issues
pnpm knip             # Find unused files/dependencies

# Koharu CLI (Interactive TUI)
pnpm koharu              # Interactive menu
pnpm koharu backup       # Backup blog content and config (--full for complete backup)
pnpm koharu restore      # Restore from backup (--latest, --dry-run, --force)
pnpm koharu update       # Update theme from upstream (--check, --skip-backup, --force)
pnpm koharu generate     # Generate content assets (interactive menu)
pnpm koharu generate lqips        # Generate LQIP image placeholders
pnpm koharu generate similarities # Generate semantic similarity vectors
pnpm koharu generate summaries    # Generate AI summaries (--model, --force)
pnpm koharu generate all          # Generate all content assets
pnpm koharu clean        # Clean old backups (--keep N to retain N most recent)
pnpm koharu list         # List all backups
```

**Note on Configuration Changes:** After modifying `config/site.yaml`, restart the dev server or rebuild. The YAML configuration is cached during build for performance.

## Architecture

### Tech Stack
- **Framework**: Astro 5.x with React integration
- **Styling**: Tailwind CSS 4.x with plugins
- **Content**: Astro Content Collections (`src/content/blog/`)
- **Animations**: Motion (Framer Motion successor)
- **State**: Nanostores
- **Search**: Pagefind (static)
- **Utilities**: es-toolkit, date-fns, sanitize-html

### Project Structure
```plain
src/
├── components/   # React & Astro components
├── content/blog/ # Markdown/MDX posts
├── layouts/      # Page layouts
├── pages/        # File-based routing
├── lib/          # Utility functions
├── hooks/        # React hooks
├── constants/    # Config, router, animations
├── scripts/      # Build-time scripts
├── store/        # Global state (nanostores)
└── types/        # TypeScript types
```

### Module Organization

**Dependency Flow** (avoid circular dependencies):
```plain
pages/ → components/ → hooks/ → lib/ → constants/
                               ↓
                             types/
```

**File Naming**:
- Barrel exports: `index.ts`
- Single export: Match filename (`useMediaQuery.ts`)
- React components: PascalCase (`PostCard.tsx`)

**Module Size Limits**:
- Max 500 lines per file
- Max 15 public exports per module
- Max 10 imports per file

### Path Aliases
```plain
@/          → src/
@lib/*      → src/lib/*
@hooks/*    → src/hooks/*
@components/* → src/components/*
@constants/* → src/constants/*
```

### Key Concepts

**Content System**: Blog posts in `src/content/blog/` using Astro Content Collections. Hierarchical categories supporting `'工具'` or `['笔记', '前端', 'React']`.

**Theme System**: Dark/light toggle with localStorage, inline check in `<head>` prevents FOUC.

**Markdown**: Shiki highlighting, auto-generated heading IDs/links via rehype plugins, GFM support.

## Component Patterns

### Component Design Principles

1. **Single Responsibility**: Each component does one thing well
2. **Props Interface**: Clear, minimal props
3. **Composition over Configuration**: Use composable components

### UI Components
- Follow **shadcn/ui patterns** with Radix UI primitives
- Use **`class-variance-authority` (cva)** for variants
- Merge Tailwind classes via `cn()` in `src/lib/utils.ts`

### Astro vs React

**Astro components** (`.astro`): Layouts, pages, static content (no JS shipped by default)
**React components** (`.tsx`): Interactive UI (state, events)

**Client directives**:
- `client:load` - Critical interactive elements (header, nav, search)
- `client:idle` - Lower-priority interactions (tooltips, modals)
- `client:visible` - Below-the-fold components (footer, comments)
- `client:only="react"` - Skip SSR (framework-specific)

### Astro Script Initialization

Always handle initialization race condition:

```typescript
// ✅ Good: Initialize immediately if DOM ready
if (document.readyState !== "loading") init();
document.addEventListener("astro:page-load", init);

// Cleanup on page swap
document.addEventListener("astro:before-swap", cleanup);
```

## Code Style & Quality

### Linting & Formatting
Biome (line width: 128, single quotes, trailing commas). Tailwind classes must be sorted.

### Frontend Quality Priorities
1. **User Experience** (Performance, Accessibility, Progressive Enhancement)
2. **Correctness** (Type safety, Edge cases, Error handling)
3. **Maintainability** (Clear abstractions, Component reuse)
4. **Performance** (Bundle size, Runtime optimization)
5. **Code brevity** (Concise but clear)

### Core Web Vitals Targets
- LCP < 2.5s
- FID/INP < 100ms
- CLS < 0.1

### Error Handling Strategy
**Layered and context-appropriate:**
1. **Data Layer** (`src/lib/`): Return `null` or throw typed errors
2. **React Components**: Use `ErrorBoundary` for component errors
3. **Async Operations**: Explicit try-catch or `.catch()`
4. **Validation**: At system boundaries only

### Performance Best Practices
- Lazy load heavy dependencies (>100KB): `const THREE = await import("three");`
- Don't prematurely optimize - measure first
- Use `useMemo()` for expensive computations only
- Use `useCallback()` only when passing to memoized children
- Use `useSyncExternalStore` for scroll events (see `useCurrentHeading`)

### Code Reuse Patterns
1. **Pure Functions** (`src/lib/`): Extract when used 2+ times
2. **React Hooks** (`src/hooks/`): Extract when pattern repeated 3+ times
3. **Shared Types** (`src/types/`): Extract when used 3+ times

### State Management Best Practices

**State Lifting**: Place state at nearest common ancestor, avoid over-lifting.

**Derived State**: Prefer `const filtered = posts.filter(...)` over `useEffect` synchronization.

**Immutability**: Always use immutable updates: `setUser(prev => ({ ...prev, name: 'Alice' }))`.

**URL State Management**: Use **nuqs** (https://nuqs.dev/) for shareable state (search, pagination, filters, tabs). Benefits: shareable URLs, bookmarkable, browser navigation, SEO-friendly.

```typescript
// ✅ Good: URL state for filters
const [search, setSearch] = useQueryState('q', { defaultValue: '' });
const [category, setCategory] = useQueryState('category');
// URL: /posts?q=react&category=tech (shareable!)
```

For Astro projects, use native `URLSearchParams`:
```typescript
const url = new URL(Astro.request.url);
const search = url.searchParams.get('q') || '';
```

### React Best Practices

**Avoid useCallback Overuse**: Only use when callback passed to memoized child.

**Fix Circular Dependencies in useEffect**: Use refs for latest state without re-subscribing.

**Avoid useState for Static Values**: Use constants or `useMemo` for computed values.

**Extract Custom Hooks**: When `useState` + `useRef` + `useEffect` pattern repeats 2+ times.

**Scroll Events**: Use `useSyncExternalStore` instead of `useState` + `useEffect`.

**Media Queries**: Use existing hooks: `useIsMobile()`, `useMediaQuery()` from `@hooks/useMediaQuery`.

**Animations**: Use Motion's `useReducedMotion()` for animation components.

**SSR Hydration**: Never use `suppressHydrationWarning`. Use `useIsMounted()` hook for client-only values.

```typescript
// ✅ Good: Avoid hydration mismatch
const isMounted = useIsMounted();
const isEnabled = useStore(christmasEnabled);
<div className={cn({ 'z-5': isMounted && isEnabled })} />
```

## Testing Strategy

**Test business logic rigorously; test UI pragmatically.**

**High Priority**: Content utilities, data transformations, build scripts
**Medium Priority**: Complex React hooks, state management
**Low Priority**: UI components (manual testing preferred)

```typescript
// Example: Pure function test
describe("getCategoryLinks", () => {
  it("returns all links recursively", () => {
    const category = {
      name: "笔记",
      link: "/category/notes",
      children: [
        { name: "前端", link: "/category/notes/front-end", children: [] }
      ]
    };
    expect(getCategoryLinks(category)).toEqual(["/category/notes/front-end"]);
  });
});
```

## Development Checklist

### Before Starting
- [ ] Understand requirement clearly
- [ ] Check existing code for similar patterns
- [ ] Verify no circular dependencies

### During Implementation
- [ ] Follow Module-First Principle
- [ ] Write pure functions where possible
- [ ] Use TypeScript strictly (no `any`)
- [ ] Extract shared logic after third use
- [ ] Handle errors appropriately
- [ ] Use existing hooks (`useMediaQuery`, `useIsMounted`, etc.)

### Component Development
- [ ] Choose Astro vs React appropriately
- [ ] Use correct client directive
- [ ] Follow composition patterns
- [ ] Wrap interactive sections in `ErrorBoundary`
- [ ] Handle SSR hydration properly

### Before Committing
- [ ] **Run linter**: `pnpm lint:fix` ✅ Required
- [ ] Run type checker: `pnpm check`
- [ ] Check for unused code: `pnpm knip`
- [ ] Verify build succeeds: `pnpm build`

## Common Code Smells

**Component-Level**:
- Oversized components (> 300 lines)
- Props drilling beyond 3 levels → use Context
- Overuse of useEffect → use derived state

**State Management**:
- Duplicate state → single source of truth
- Missing URL state for shareable filters → use nuqs

**Performance**:
- Unnecessary re-renders → missing memo when needed
- Premature optimization → measure first
- Large dependencies not lazy-loaded (> 100KB)

## Common Pitfalls

### 1. Circular Dependencies
Extract shared logic to separate file instead of importing between peer modules.

### 2. Hydration Mismatches
Use `useIsMounted()` for client-only values, never `suppressHydrationWarning`.

### 3. Overuse of useEffect
Prefer derived values: `const fullName = \`${first} ${last}\``instead of`useEffect` synchronization.

### 4. Over-abstraction
Inline until pattern appears 3 times. Avoid unnecessary abstractions.

### 5. Tight Coupling to Framework
Keep business logic pure, framework calls at boundaries.

## Resources

### Documentation
- [Astro Docs](https://docs.astro.build/)
- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Motion](https://motion.dev/)
- [Nanostores](https://github.com/nanostores/nanostores)

### Tools
- [Biome](https://biomejs.dev/) - Linter and formatter
- [Pagefind](https://pagefind.app/) - Static search
- [es-toolkit](https://es-toolkit.slash.page/) - Utility library

### Internal References
- Core utilities: `src/lib/content/`, `src/lib/utils.ts`
- Reusable hooks: `src/hooks/`
- Animation presets: `src/constants/anim/`
- Site configuration: `src/constants/site-config.ts`

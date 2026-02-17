# astro-koharu

**Language:** [中文](../README.md) | **English** | [日本語](../docs/README.ja.md)

![](https://r2.cosine.ren/i/2026/01/94383107ba4586f773938ed4dae34ff1.webp)

A cute / anime-style / pink-blue themed blog, perfect for ACG, frontend dev, and journaling personal sites with excellent performance.

> The name is inspired by "Koharu-biyori" (こはるびより), which refers to the period from late autumn to early winter when there's a stretch of warm, spring-like sunny days — known as "Indian summer" in English.

The overall design is inspired by the Hexo [Shoka](https://shoka.lostyu.me/computer-science/note/theme-shoka-doc/) theme, rebuilt with a modern tech stack for your personal blog.

This repository has been cleaned up as a demo repository. Visit the theme developer's blog at https://blog.cosine.ren/ — give it a star if you like it!

Under active development

- Built on **Astro**, static output, fast loading
- Cute / anime-style / pink-blue color scheme, ideal for ACG, frontend, and journaling sites
- Multi-category and multi-tag support without forcing complex information architecture
- Minimal performance overhead
- Serverless full-site search powered by Pagefind
- LQIP (Low Quality Image Placeholders) — gradient placeholders shown before images load

![Demo](https://r2.cosine.ren/i/2025/12/417b098dffce2ced9c0ff6009e5213df.gif)

[Excellent Performance](https://pagespeed.web.dev/analysis/https-blog-cosine-ren/w6qzrwbp9b?hl=en&form_factor=desktop): Aiming for all-green on desktop, though continuous checking is needed as features evolve!

![Performance](https://r2.cosine.ren/i/2025/12/e93f40c340a626c4ab72212a84cf6d5d.webp)

You can provide [feedback](https://cos.featurebase.app/) and check the Roadmap here. Issues are also welcome — but since this is a personal project, feel free to fork and customize!

![](https://r2.cosine.ren/i/2026/01/f1c239b4adf7771f10b954c389d87a74.webp)
![](https://r2.cosine.ren/i/2026/01/c962f82503abf68eb1f21b835873f241.webp)

## Deployment

Supports automatic deployment on mainstream platforms including **Vercel** and **Netlify**. The adapter is automatically selected based on the environment; unrecognized platforms fall back to the Node.js adapter (suitable for Docker or self-hosting).

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cosZone/astro-koharu&project-name=astro-koharu&repository-name=astro-koharu)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/cosZone/astro-koharu)

### Docker Deployment

You can also run a container with Nginx via docker / docker-compose:

1. Edit `config/site.yaml` to configure the `comment.remark42` and `analytics.umami` sections.
2. Run `./docker/rebuild.sh` — the script will automatically stop old containers and rebuild/restart.

> To customize the env file path or skip `docker compose down`, set `ENV_FILE=/path/to/.env` or `SKIP_DOWN=true` when running the script.

To run Compose manually from the repository root:

```bash
docker compose --env-file ./.env -f docker/docker-compose.yml up -d --build
```

### Local Development

1. Clone the project

```bash
git clone https://github.com/cosZone/astro-koharu
```

2. Enter the project directory and install dependencies

```bash
cd astro-koharu
pnpm i
```

3. Start the dev server

```bash
pnpm dev
```

## Features

- Built on Astro 5.x with static site generation and excellent performance
- Elegant dark/light theme toggle
- Serverless full-site search powered by Pagefind
- **Swappable comment systems**: Supports Waline (recommended), Giscus, and Remark42 — one-click switch in config, theme auto-follows
- Full Markdown enhancements (GFM, syntax highlighting, auto TOC, Mermaid diagrams, Infographic charts)
- **Shoka-compatible Markdown syntax**: Text effects (underline/highlight/superscript & subscript/color), spoiler text, ruby annotations, admonition blocks, collapsible blocks, tab cards, friend link cards, audio/video players, quiz system (single choice/multiple choice/true-false/fill-in-the-blank), math formulas (KaTeX), code block enhancements (title/mark/command) — all features can be individually toggled
- Flexible multi-level category and tag system
- [Toggleable] Multi-series article support (weekly digest, book notes, etc. with custom URL slugs)
  > **Note**: featuredSeries is designed for categories with many articles, separating them from the homepage main list to avoid clutter. Only the latest article in a series is highlighted on the homepage; the rest are accessed through the series' dedicated page, while still appearing normally in archive, category, and tag pages.
- **Standalone page system**: Create `.md` files under `src/pages/` to add custom pages (about, playlists, etc.) with custom cover titles and comment toggles
- Responsive design
- Draft and pinned post support
- Reading progress bar and estimated reading time
- Smart TOC navigation with CSS counter auto-numbering (can be disabled per post)
- Mobile article reading header (shows current section title, circular reading progress, expandable TOC)
- Friend links system and archive page
- **Internationalization (i18n)**: Built-in Chinese/English UI translations, custom language packs, content-level translations (category/series names), language switcher, hreflang SEO tags, and locale-aware RSS feeds. Default locale URLs have no prefix; other locales are prefixed (e.g., `/en/post/xxx`)
- RSS feed support
- LQIP support: Gradient placeholders before images load for better visual experience
- [Toggleable] Semantic similarity-based smart article recommendation system using [transformers.js](https://huggingface.co/docs/transformers.js) to generate local article embedding vectors
- [Toggleable] AI-powered automatic summary generation
- [Toggleable] Christmas special: snowfall, Christmas colors, Santa hats, string lights, and other festive effects
- Serverless site announcement system: Manage announcements via config file with time controls, stacking, custom colors, and hover-to-read
- Styled [RSS](https://blog.cosine.ren/rss.xml) feed page
- **Koharu CLI**: Interactive command-line tool for backup/restore, content generation, and backup management
- **Local lightweight CMS app**: Run `pnpm cms` to launch a standalone CMS interface with article management, in-browser editing, and Markdown preview. The edit button on article pages supports one-click jump to local editors (VS Code / Cursor / Zed), configured in the `dev` section of `config/site.yaml`. (A backend version may be considered later; this version is static)

## Koharu CLI

The blog comes with an interactive CLI tool for managing blog content:

```bash
pnpm koharu              # Interactive main menu
pnpm koharu new          # Create new content (post/friend link)
pnpm koharu backup       # Backup blog content and config
pnpm koharu restore      # Restore from backup
pnpm koharu update       # Update theme
pnpm koharu generate     # Generate content assets (LQIP, similarity, AI summaries)
pnpm koharu clean        # Clean old backups
pnpm koharu list         # List all backups
```

### Creating Content

Quickly create blog posts and friend links:

```bash
# Interactive type selection
pnpm koharu new

# Or specify the type directly
pnpm koharu new post     # Create a new blog post (interactive title, category, tags, etc.)
pnpm koharu new friend   # Create a new friend link (auto-appended to config/site.yaml)
```

**New Post features**:

- Auto-generated pinyin slug
- Select from existing categories
- Multi-tag support
- Duplicate file detection
- Auto-generated frontmatter

**New Friend Link features**:

- Interactive friend site info input
- Auto-appended to config file
- Preserves YAML format and comments

### Backup & Restore

Before updating the theme, use the CLI to backup your personal content:

```bash
# Basic backup (blog posts, config, avatar, .env)
pnpm koharu backup

# Full backup (includes all images and generated assets)
pnpm koharu backup --full

# Restore latest backup
pnpm koharu restore --latest

# Preview files to be restored (dry run)
pnpm koharu restore --dry-run
```

### Updating the Theme

Use the CLI to automatically update the theme (auto backup → pull → merge → install dependencies):

```bash
# Full update flow (backs up first by default)
pnpm koharu update

# Check for updates only
pnpm koharu update --check

# Skip backup and update directly
pnpm koharu update --skip-backup

# Update to a specific version
pnpm koharu update --tag v2.1.0

# Clean mode (zero conflicts, forced backup, ideal for first migration or heavy conflicts)
pnpm koharu update --clean

# Rebase mode (rewrites history, forced backup, for git-savvy users)
pnpm koharu update --rebase

# Preview operations (dry run)
pnpm koharu update --dry-run
```

> **Update Mode Details:**
>
> - **Default mode**: Uses `git merge --no-ff` to merge upstream updates, preserving merge-base info. User content conflicts (blog posts, config, etc.) are automatically resolved in favor of the local version; only theme file conflicts require manual resolution.
> - **Clean mode** (`--clean`): Replaces all theme files with the latest upstream version, then restores user content from backup for zero-conflict updates. Ideal for first-time migration or heavy conflicts. **Note: Custom modifications to theme files will not be preserved.**
> - **Rebase mode** (`--rebase`): Replays local commits on top of upstream, rewriting commit history. Suitable for git-savvy users.
>
> The CLI update command wraps git operations. Users familiar with git can also use `git merge`/`git rebase` manually.

### Content Generation

```bash
# Interactive type selection
pnpm koharu generate

# Or specify the type directly
pnpm koharu generate lqips        # Generate LQIP image placeholders
pnpm koharu generate similarities # Generate similarity vectors
pnpm koharu generate summaries    # Generate AI summaries
pnpm koharu generate all          # Generate all
```

## Configuration

All blog configuration is managed through **`config/site.yaml`**, including:

- Site information (title, subtitle, author, etc.)
- Social media links
- Navigation menu
- Featured categories and series configuration
- Category mapping (display name → URL slug)
- Friend links list
- Announcement system
- **Comment system** (Waline / Giscus / Remark42, Waline recommended)
- Analytics (Umami)
- **Internationalization (i18n)**
- Christmas special toggle
- Development tools (the `dev` section in `config/site.yaml` for local editor jump)

See the documentation for detailed configuration instructions.

### Multi-language Configuration (i18n)

Configure supported languages in the `i18n` section of `config/site.yaml`:

```yaml
i18n:
  defaultLocale: zh        # Default locale (no URL prefix)
  locales:
    - code: zh
      label: 中文
    - code: en
      label: English
```

**Content translations**: Configure translations for category names, series names, and other content-level strings in `config/i18n-content.yaml`:

```yaml
en:
  categories:
    life: Life
    note: Notes
    tools: Tools
  series:
    weekly:
      label: My Weekly
      fullName: My Tech Weekly
```

**Adding translated posts**: Place translated posts under `src/content/blog/<locale>/`, mirroring the default locale's directory structure:

```plain
src/content/blog/
├── tools/getting-started.md        # Default locale (zh)
├── en/tools/getting-started.md     # English translation
└── en/life/hello-world.md          # English translation
```

Posts without a translation will automatically fall back to the default locale content, with a notice displayed.

**Adding a new language**:

1. Add the new locale to `i18n.locales` in `config/site.yaml`
2. Create `src/i18n/translations/<code>.ts` — translate UI strings as needed (missing keys fall back to the default locale)
3. Register the new locale in `src/i18n/translations/index.ts`
4. Add content translations in `config/i18n-content.yaml` (optional)

### Switching Comment Systems

Switch comment systems via the `comment.provider` field in `config/site.yaml`:

```yaml
comment:
  provider: waline # 'waline' | 'giscus' | 'remark42' | 'none'
  waline:
    serverURL: https://your-waline-server.vercel.app
    # ... other config
```

**Waline is recommended**: Easy self-deployment, feature-rich (Markdown, emoji, email notifications), with built-in pageview stats. See the [full usage guide](/src/content/blog/tools/astro-koharu-guide.md#如何添加评论功能) for detailed configuration.

## Documentation

- **[Getting Started](../GETTING-STARTED.md)** - Launch your blog
- **[Updating the Theme](../GETTING-STARTED.md#7-更新主题)** - How to safely update to a new version
- **[Full Usage Guide](../src/content/blog/tools/astro-koharu-guide.md)** - Detailed configuration and usage for all features

## Feature Showcase

- Gradient placeholders before images load for better visual experience - [Blog Post](https://blog.cosine.ren/post/astro-lqip-implementation)
  ![LQIP](https://r2.cosine.ren/i/2025/12/40e44c8ac166183d5f823d7aa81fa792.webp)
- Smooth dark mode transition animation powered by View Transitions API
  ![Theme Transition](https://r2.cosine.ren/i/2025/12/418c7602ce115660bed9db66739370d5.gif)
- Markdown enhancement - Link embed feature - [Example](https://blog.cosine.ren/post/my-claude-code-record-2)
  ![Link Embed](https://r2.cosine.ren/i/2026/01/6804aa167fd4cf7022a9b511d52017ce.webp)
- Markdown enhancement - Create beautiful infographics with [@antv/infographic](https://github.com/antvis/Infographic)
  [Infographic Guide](https://koharu.cosine.ren/post/infographic-guide)
  ![Infographic Syntax](https://r2.cosine.ren/i/2026/01/581893e18557bcb837177cb2d6fb7af7.webp)
- Styled RSS feed page - [Example](https://blog.cosine.ren/rss.xml)
  ![RSS Feed](https://r2.cosine.ren/i/2026/01/4476f67d1acea2e0991cc70d1d3cf6a1.webp)
- Announcement system
  ![Announcements](https://r2.cosine.ren/i/2026/01/a4660955f52438b3cc2d21bdc931bbd4.gif)
- Shoka-compatible Markdown syntax - Admonition blocks, collapsible blocks, tab cards, text effects, spoiler text, ruby annotations, quizzes, and more
- Audio/video player - Supports NetEase Cloud Music playlists and video playback

## Blogs Using This Theme

> Inspired by [Zhilu's Blog](https://github.com/L33Z22L11/blog-v3), here's a showcase of blogs using this theme.\
> Join QQ group 598022684 for discussion, or chat in the comments of my [frontend channel](https://t.me/cosine_front_end).

| Blog                                         | Author     | Repository                                                      | Notes                                   |
| -------------------------------------------- | ---------- | --------------------------------------------------------------- | --------------------------------------- |
| **[Cosine's Blog](http://blog.cosine.ren/)** | **cosine** | [cosZone/astro-koharu](https://github.com/cosZone/astro-koharu) | This theme                              |
| [XueHua's Blog](https://xhblog.top/)         | XueHua-s   | [XueHua-s/astro-snow](https://github.com/XueHua-s/astro-snow)   | Simplified features, added a start page |

## Acknowledgements

Font used: [Chill Round](https://chinese-font.netlify.app/zh-cn/fonts/hcqyt/ChillRoundFRegular)

Thanks to the following projects for providing inspiration and reference for astro-koharu:

- [mx-space](https://github.com/mx-space)
- [Hexo Theme Shoka](https://shoka.lostyu.me/computer-science/note/theme-shoka-doc/)
- [waterwater.moe](https://github.com/lawvs/lawvs.github.io)
- [yfi.moe](https://github.com/yy4382/yfi.moe)
- [4ark.me](https://github.com/gd4Ark/gd4Ark.github.io)
- [Zhilu's Blog](https://blog.zhilu.site/)

...

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=cosZone/astro-koharu&type=date&legend=top-left)](https://www.star-history.com/#cosZone/astro-koharu&type=date&legend=top-left)

## License

GNU Affero General Public License version 3 (AGPL-3.0)

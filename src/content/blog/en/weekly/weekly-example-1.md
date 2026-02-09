---
title: Example Weekly Vol.1
link: weekly-example-1
catalog: true
date: 2024-01-04 00:00:00
description: This is an example weekly issue, demonstrating how the weekly/series feature works. Ideal for publishing regularly updated serial content.
tags:
  - 周刊
categories:
  - 周刊
---

This is an example weekly issue, demonstrating how the weekly/series feature works.

## About the Weekly Feature

The weekly feature is one of astro-koharu's signature capabilities, ideal for publishing regularly updated serial content such as:

- Tech newsletters
- Reading notes series
- Learning journals
- Project progress updates

## Weekly Configuration

Configure in `config/site.yaml`:

```yaml
featuredSeries:
  categoryName: 周刊       # Category name
  label: My Weekly          # Display label
  fullName: My Tech Weekly
  description: Weekly description...
  cover: /img/weekly_header.webp
  enabled: true            # Set false to disable
```

## Weekly Features

1. **Dedicated Page** - Each series has its own page at `/weekly`
2. **Homepage Display** - The latest issue is pinned on the homepage
3. **Separate Listing** - Weekly posts don't appear in the regular post list
4. **Series Navigation** - Previous/next navigation between issues

## This Week's Content

### Recommended Reading

- [Astro 5.0 New Features](https://astro.build)
- [Tailwind CSS 4.0 Released](https://tailwindcss.com)

### Tool Recommendations

| Tool   | Purpose        | Link       |
| ------ | -------------- | ---------- |
| Biome  | Code linting   | biome.dev  |
| Motion | Animation lib  | motion.dev |

### Weekly Learning

What I learned this week:

- [x] Astro Content Collections
- [x] Tailwind Theme Configuration
- [ ] Advanced Motion Animations

## Next Issue Preview

The next issue will cover more advanced features — stay tuned!

---

Thanks for reading this week's newsletter!

# Mobile TOC regression tests

Run against an Astro development server:

```sh
pnpm exec astro dev --host 127.0.0.1 --port 4353
TOC_BASE_URL=http://127.0.0.1:4353 pnpm exec playwright test -c tests/toc/playwright.config.ts
```

Without `TOC_BASE_URL`, Playwright starts a server at port 4353. Artifacts default to `/tmp/astro-koharu-toc-results`.
Chromium and WebKit cover repeated touch opening at 320px/390px portrait and 844px landscape, per-frame opacity and
clip-path completion, current-heading focus, stable article position, dismissal and reduced motion.
The desktop case checks keyboard opening, focus restoration and switching back to the sidebar TOC.
These are browser-emulated viewports, not physical-device verification.

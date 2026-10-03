# Motion preference regression tests

Run against an Astro development server from this worktree:

```sh
pnpm exec astro dev --host 127.0.0.1 --port 4339
pnpm exec playwright test --config tests/motion/playwright.config.ts
```

`MOTION_BASE_URL` overrides the default `http://127.0.0.1:4339`. `MOTION_OUTPUT_DIR` overrides the artifact directory,
which defaults to `/tmp/astro-koharu-motion-results`.

These targeted Chromium checks cover desktop and a 390px mobile viewport: system and saved site preferences (including legacy settings), all three motion levels,
runtime changes, actual settings controls and Astro navigation, CSS visibility, scroll buttons, modal/drawer dismissal,
404 decoration, spoiler replacement and rich child focus guards, image lightbox controls, active collapse and segmented animations,
delayed banner loading, and a simulated 4× CPU slowdown.
`completion.spec.ts` checks every frame around native opacity, clip-path, filter and transform completion, including
that native acceleration stays enabled. These cases reproduce the hidden initial styles briefly returning with Motion 11.
`handoff.spec.ts` checks native animation completion in search, settings, language menus and the toolbar.
`reduced-layout.spec.ts` checks immediate positioning without unintended CSS transitions while authored transitions still emit completion events.
System preference changes use Chromium's native media emulation. The slow CPU case checks operability; it is not
evidence from a physical low-end device.

The spoiler, Moments and lightbox fixtures import the current source through Vite. Run against `astro dev`, not a
production preview. Moments fixtures execute the real component scripts even when the Moments route is disabled.
The separate snowfall fixture mounts the real canvas component even when Christmas effects are disabled in site configuration.
The Playwright global setup preloads these fixtures in an isolated page before assertions run. It retries Vite
optimization reloads at most twice; source failures still fail the run. No manual warmup is required.
No formal acceptance runner or report workflow is involved.

`mobile-viewers.spec.ts` also exercises 320px/390px portrait and 844px landscape code readers, viewport rotation,
content-sized bottom sheets, a full-width bottom close action, backdrop dismissal, 44px touch targets, wrapping,
native two-axis touch scrolling, Shiki dark colors and line markers, and page position. Short code must fit its content;
long code scrolls inside a sheet that leaves at least 48px of backdrop visible above it.
The synthetic long-code case dispatches a late `astro:page-load` while the sheet is open to verify drawer initialization preserves its scroll lock.
Its diagram gesture contract uses synthetic touch events to verify pinch-to-pan continuity and cancellation;
physical device behavior needs separate checks. `fullscreen.spec.ts` retains the opening/closing opacity regression checks.

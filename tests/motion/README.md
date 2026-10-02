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
System preference changes use Chromium's native media emulation. The slow CPU case checks operability; it is not
evidence from a physical low-end device.

The spoiler, Moments and lightbox fixtures import the current source through Vite. Run against `astro dev`, not a
production preview. Moments fixtures execute the real component scripts even when the Moments route is disabled.
The separate snowfall fixture mounts the real canvas component even when Christmas effects are disabled in site configuration.
The Playwright global setup preloads these fixtures in an isolated page before assertions run. It retries Vite
optimization reloads at most twice; source failures still fail the run. No manual warmup is required.
No formal acceptance runner or report workflow is involved.

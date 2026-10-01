import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from '@playwright/test';

// Start a dev or preview server first. Override BASE_URL and BROWSERS for other targets.
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4321';
const browsers = { chromium, firefox, webkit };
const panelSelector = '[role="dialog"].origin-bottom-right';
const cases = [
  { level: 'lively', mobile: false },
  { level: 'lively', mobile: true },
  { level: 'subtle', mobile: false },
  { level: 'reduced', mobile: false },
  { level: 'lively', mobile: false, reducedMotion: 'reduce' },
];

for (const name of (process.env.BROWSERS ?? 'chromium').split(',')) {
  assert.ok(browsers[name], `Unknown browser: ${name}`);
  const browser = await browsers[name].launch();
  try {
    for (const testCase of cases) {
      const context = await browser.newContext({
        viewport: testCase.mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
        reducedMotion: testCase.reducedMotion ?? 'no-preference',
      });
      try {
        await context.addInitScript((level) => {
          localStorage.setItem('site-motion-level', level);
        }, testCase.level);
        const page = await context.newPage();
        page.setDefaultTimeout(10000);
        page.setDefaultNavigationTimeout(30000);
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
        if (testCase.mobile) await page.getByRole('button', { name: '展开/收起工具栏', exact: true }).click();
        const toggle = page.getByRole('button', { name: '设置', exact: true });
        await toggle.waitFor({ state: 'visible' });

        // Sample the actual paint styles, including the frame where a native animation finishes.
        // A visibility assertion after the animation would miss the one-frame opacity reset.
        for (let attempt = 0; attempt < 3; attempt++) {
          await page.evaluate((selector) => {
            window.settingsAnimationSample = new Promise((resolve) => {
              const frames = [];
              const nodes = new Set();
              let mountedAt;
              const deadline = performance.now() + 5000;
              function sample() {
                const node = document.querySelector(selector);
                if (node) {
                  mountedAt ??= performance.now();
                  nodes.add(node);
                }
                if (mountedAt !== undefined) {
                  let opacity = node ? 1 : 0;
                  for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
                    opacity *= Number(getComputedStyle(ancestor).opacity);
                  }
                  const transform = node ? new DOMMatrixReadOnly(getComputedStyle(node).transform) : new DOMMatrixReadOnly();
                  frames.push({ opacity, scale: Math.hypot(transform.a, transform.b) });
                }
                if ((mountedAt !== undefined && performance.now() - mountedAt >= 700) || performance.now() >= deadline) {
                  resolve({ frames, nodeCount: nodes.size });
                } else {
                  requestAnimationFrame(sample);
                }
              }
              requestAnimationFrame(sample);
            });
          }, panelSelector);
          await toggle.click();
          const { frames, nodeCount } = await page.evaluate(() => window.settingsAnimationSample);
          const label = `${name} ${JSON.stringify(testCase)} open ${attempt + 1}`;
          assert.equal(nodeCount, 1, `${label}: panel was missing or remounted`);
          assert.ok(frames.at(-1).opacity > 0.99, `${label}: panel did not finish opening`);
          for (let index = 1; index < frames.length; index++) {
            const previous = frames[index - 1];
            const current = frames[index];
            assert.ok(
              previous.opacity <= 0.5 || previous.opacity - current.opacity < 0.25,
              `${label}: opacity fell from ${previous.opacity} to ${current.opacity}`,
            );
            assert.ok(previous.scale < 0.99 || current.scale > 0.98, `${label}: panel jumped back to its initial size`);
          }
          assert.deepEqual(errors, [], `${label}: browser errors`);

          if (attempt === 0) {
            await page.getByRole('button', { name: '阅读', exact: true }).click();
            await page.getByRole('button', { name: '通用', exact: true }).click();
          }

          if (attempt === 0) await page.getByRole('button', { name: '关闭设置面板', exact: true }).click();
          else if (attempt === 1) await page.keyboard.press('Escape');
          else await toggle.click();
          await page.locator(panelSelector).waitFor({ state: 'detached' });
          await page.mouse.move(100, 100);
        }
        console.log(`PASS ${name} ${JSON.stringify(testCase)}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

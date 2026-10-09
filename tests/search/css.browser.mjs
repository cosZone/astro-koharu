import fs from 'node:fs/promises';
import { chromium, devices, expect, webkit } from '@playwright/test';

const origin = process.env.SEARCH_TEST_ORIGIN ?? 'http://127.0.0.1:4357';
const stylesheet = '**/pagefind/pagefind-component-ui.css';
const rows = [];

async function ready(page) {
  await expect(page.locator('astro-island[component-url*="SearchDialog"]')).not.toHaveAttribute('ssr');
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function navigate(page) {
  const timeOrigin = await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = '/posts/';
    link.dataset.cssTestNavigation = '';
    link.textContent = 'Navigate';
    document.body.append(link);
    document.documentElement.dataset.cssNavigationComplete = 'false';
    document.addEventListener(
      'astro:page-load',
      () => {
        document.documentElement.dataset.cssNavigationComplete = 'true';
      },
      { once: true },
    );
    return performance.timeOrigin;
  });
  await page.locator('[data-css-test-navigation]').click();
  await page.waitForFunction(() => document.documentElement.dataset.cssNavigationComplete === 'true');
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  await ready(page);
}

for (const profile of [
  { name: 'desktop Chromium', engine: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'iPhone WebKit', engine: webkit, options: devices['iPhone 13'] },
]) {
  const browser = await profile.engine.launch();
  try {
    for (const scenario of ['navigation', 'cancel-navigation', 'failure']) {
      const context = await browser.newContext(profile.options);
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      if (process.env.SEARCH_TEST_DEBUG) {
        console.log(`START ${profile.name}: ${scenario}`);
        page.on('console', (message) => console.log(message.text()));
        await page.addInitScript(() => {
          for (const name of [
            'astro:before-preparation',
            'astro:after-preparation',
            'astro:before-swap',
            'astro:after-swap',
            'astro:page-load',
          ]) {
            document.addEventListener(name, () => console.log(`EVENT ${name}`));
          }
        });
      }
      const timer = setTimeout(() => {
        void context.close();
      }, 45000);
      let release;
      const requests = [];
      page.on('request', (request) => requests.push(request.url()));
      try {
        await page.goto(origin, { waitUntil: 'domcontentloaded' });
        await ready(page);
        expect(requests.filter((url) => url.endsWith('pagefind-component-ui.css'))).toHaveLength(0);
        const open = () => page.getByRole('button', { name: '搜索', exact: true }).click();
        const input = page.locator('#search-dialog-container .pf-searchbox-input');
        if (scenario === 'navigation') {
          await open();
          await expect(input).toBeVisible();
          await expect(input).toBeFocused();
          await page.keyboard.press('Escape');
          await navigate(page);
          expect(await page.locator('#pagefind-search-styles').getAttribute('href')).toBeNull();
          const gate = new Promise((resolve) => {
            release = resolve;
          });
          await page.route(stylesheet, async (route) => {
            await gate;
            await route.continue();
          });
          const requested = page.waitForRequest(stylesheet);
          await open();
          await requested;
          await expect(page.locator('#search-for-dialog')).toHaveAttribute('data-search-pending', '');
          await expect(input).not.toBeVisible();
          release();
          await expect(input).toBeVisible();
          await expect(input).toBeFocused();
          expect(requests.filter((url) => url.endsWith('pagefind-component-ui.css'))).toHaveLength(2);
        } else if (scenario === 'cancel-navigation') {
          const gate = new Promise((resolve) => {
            release = resolve;
          });
          await page.route(stylesheet, async (route) => {
            await gate;
            await route.continue().catch(() => {});
          });
          const requested = page.waitForRequest(stylesheet);
          await open();
          await requested;
          await expect(page.locator('#search-dialog-container [data-search-loading]')).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(page.locator('#search-dialog-container')).toHaveCount(0);
          await navigate(page);
          release();
          await page.unroute(stylesheet);
          await expect(page.locator('#search-dialog-container')).toHaveCount(0);
          await open();
          await expect(input).toBeVisible();
          await expect(input).toBeFocused();
        } else {
          await page.route(stylesheet, (route) => route.abort());
          await open();
          await expect(page.locator('#search-dialog-container [data-search-loading]')).toHaveText(
            '搜索加载失败，请刷新页面重试。',
          );
          await page.keyboard.press('Escape');
          await expect(page.locator('#search-dialog-container')).toHaveCount(0);
          expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
          await page.unroute(stylesheet);
          await open();
          await expect(input).toBeVisible();
          await expect(input).toBeFocused();
        }
        expect(
          await page.evaluate(() => {
            const link = document.getElementById('pagefind-search-styles');
            return Boolean(link.sheet && !link.disabled);
          }),
        ).toBe(true);
        rows.push({ profile: profile.name, scenario, passed: true });
        console.log(`PASS ${profile.name}: ${scenario}`);
      } finally {
        clearTimeout(timer);
        release?.();
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
if (process.env.SEARCH_TEST_OUTPUT) {
  await fs.writeFile(process.env.SEARCH_TEST_OUTPUT, JSON.stringify({ sourceVersion: 33, origin, rows }, null, 2));
}

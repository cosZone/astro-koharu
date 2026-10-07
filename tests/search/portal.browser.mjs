import { chromium, devices, expect, webkit } from '@playwright/test';

const origin = process.env.SEARCH_TEST_ORIGIN || 'http://127.0.0.1:4321';
const runtime = '**/pagefind/pagefind-component-ui.js';

async function openSearch(page) {
  await page.getByRole('button', { name: /^(搜索|検索)$/ }).click();
}

async function softNavigate(page, path) {
  await page.evaluate((path) => {
    const anchor = document.createElement('a');
    anchor.href = path;
    anchor.dataset.testNavigation = '';
    anchor.textContent = 'Navigate';
    document.body.append(anchor);
  }, path);
  const pageLoad = page.evaluate(
    () => new Promise((resolve) => document.addEventListener('astro:page-load', () => resolve(true), { once: true })),
  );
  await page.locator('[data-test-navigation]').click();
  await pageLoad;
  await expect(page).toHaveURL(`${origin}${path}`);
}

for (const profile of [
  { name: 'desktop Chromium', engine: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'Android Chromium emulation', engine: chromium, options: devices['Pixel 7'] },
  { name: 'iPhone WebKit emulation', engine: webkit, options: devices['iPhone 13'] },
]) {
  const browser = await profile.engine.launch();
  try {
    for (const scenario of ['navigation', 'cancel', 'failure']) {
      const context = await browser.newContext(profile.options);
      const page = await context.newPage();
      const requests = [];
      const errors = [];
      page.on('request', (request) => requests.push(request.url()));
      page.on('pageerror', (error) => errors.push(error.message));
      let release;
      try {
        if (scenario === 'cancel') {
          const pending = new Promise((resolve) => {
            release = resolve;
          });
          await page.route(runtime, async (route) => {
            await pending;
            await route.continue();
          });
        } else if (scenario === 'failure') {
          await page.route(runtime, (route) => route.abort());
        }
        await page.goto(origin, { waitUntil: 'load' });
        await expect(page.locator('astro-island[component-url*="SearchDialog"]')).not.toHaveAttribute('ssr');
        expect(requests.filter((url) => url.endsWith('pagefind-component-ui.js'))).toHaveLength(0);
        await openSearch(page);
        const input = page.locator('#search-dialog-container .pf-searchbox-input');
        if (scenario === 'cancel') {
          await expect(page.locator('#search-dialog-container [data-search-loading]')).toBeVisible();
          await page.getByRole('dialog').getByRole('button', { name: '关闭', exact: true }).click();
          await expect(page.locator('#search-dialog-container')).toHaveCount(0);
          await softNavigate(page, '/posts/');
          const response = page.waitForResponse(runtime);
          release();
          await response;
          await page.waitForFunction(() => Boolean(customElements.get('pagefind-searchbox')));
          await page.evaluate(() => new Promise(requestAnimationFrame));
          await expect(page.locator('#search-dialog-container')).toHaveCount(0);
          await openSearch(page);
          await expect(input).toBeVisible();
          await expect(input).toBeFocused();
        } else if (scenario === 'failure') {
          await expect(page.locator('#search-dialog-container [data-search-loading]')).toHaveText(
            '搜索加载失败，请刷新页面重试。',
          );
          await page.getByRole('dialog').getByRole('button', { name: '关闭', exact: true }).click();
          await expect(page.locator('#search-dialog-container')).toHaveCount(0);
          expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
        } else {
          await expect(input).toBeVisible();
          await expect(input).toBeFocused();
          await input.fill('Astro');
          await expect(page.locator('#search-dialog-container .pf-searchbox-result').first()).toBeVisible({ timeout: 15000 });
          await page.keyboard.press('Escape');
          await softNavigate(page, '/posts/');
          await openSearch(page);
          await expect(input).toBeVisible();
          await expect(input).toBeFocused();
          await page.keyboard.press('Escape');
          await softNavigate(page, '/ja/');
          await openSearch(page);
          await expect(input).toBeVisible();
          await expect(input).toBeFocused();
          await expect(input).toHaveAttribute('placeholder', 'キーワードで検索');
          expect(requests.filter((url) => url.endsWith('pagefind-component-ui.js'))).toHaveLength(1);
        }
        if (scenario !== 'failure') expect(errors).toEqual([]);
        console.log(`PASS ${profile.name}: ${scenario}`);
      } finally {
        release?.();
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

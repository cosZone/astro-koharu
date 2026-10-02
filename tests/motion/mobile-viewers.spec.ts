import { expect, type Locator, type Page, test } from '@playwright/test';

const codePanel = '[role="dialog"]:has(pre.astro-code)';

async function articleReady(page: Page) {
  await page.goto('/post/note/shoka-features', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const island = document.querySelector('astro-island[component-url*="CodeBlockFullscreen"]');
    return island && !island.hasAttribute('ssr');
  });
}

async function noPageOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(1);
}

async function reachableTouchTarget(button: Locator) {
  const result = await button.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { width: rect.width, height: rect.height, reachable: hit !== null && element.contains(hit) };
  });
  expect(result.width).toBeGreaterThanOrEqual(44);
  expect(result.height).toBeGreaterThanOrEqual(44);
  expect(result.reachable).toBe(true);
}

async function swipe(page: Page, element: Locator, axis: 'x' | 'y') {
  const rect = await element.boundingBox();
  if (!rect) throw new Error('Scroll surface is not visible');
  const x = rect.x + Math.min(rect.width * 0.8, rect.width - 30);
  const y = rect.y + Math.min(rect.height * 0.7, rect.height - 30);
  const distance = Math.min(axis === 'x' ? rect.width * 0.6 : rect.height * 0.5, 220);
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x - (axis === 'x' ? (distance * step) / 8 : 0), y: y - (axis === 'y' ? (distance * step) / 8 : 0) }],
      });
      await page.waitForTimeout(20);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await session.detach();
  }
}

test.beforeEach(async ({ isMobile }) => {
  test.skip(!isMobile, 'These cases exercise touch input and mobile viewport layouts.');
});

for (const viewport of [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`article code opens and closes by touch at ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await articleReady(page);
    await noPageOverflow(page);
    const block = page.locator('.code-block-wrapper').first();
    const source = await block.locator('pre code').textContent();
    const opener = block.getByRole('button', { name: '全屏查看', exact: true }).last();
    await opener.scrollIntoViewIfNeeded();
    await reachableTouchTarget(opener);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await opener.tap();

    const panel = page.locator(codePanel);
    await expect(panel).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    await expect.poll(async () => (await panel.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(viewport.width - 1);
    await expect.poll(async () => (await panel.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(viewport.height - 1);
    expect(await panel.locator('code').textContent()).toBe(source);
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await noPageOverflow(page);

    const close = panel.getByRole('button', { name: '关闭', exact: true });
    const wrap = panel.getByRole('button', { name: '自动换行', exact: true });
    await reachableTouchTarget(close);
    await reachableTouchTarget(wrap);
    await reachableTouchTarget(panel.getByRole('button', { name: '复制', exact: true }));
    expect(
      await panel.evaluate((element) => element.contains(document.elementFromPoint(24, 24))),
      'The viewer must cover the mobile menu button',
    ).toBe(true);
    await wrap.tap();
    await expect(wrap).toHaveAttribute('aria-pressed', 'true');
    expect(await panel.locator('code').textContent()).toBe(source);

    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    await page.screenshot({ path: testInfo.outputPath(`code-${viewport.width}.png`) });

    if (viewport.width === 390) {
      await page.setViewportSize({ width: 844, height: 390 });
      await expect.poll(async () => (await panel.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(843);
      await expect.poll(async () => (await panel.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(389);
      await noPageOverflow(page);
      await reachableTouchTarget(close);
      await page.screenshot({ path: testInfo.outputPath('code-390-resized.png') });
    }
    const beforeClose = await page.evaluate(() => window.scrollY);
    await close.tap();
    await expect(panel).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(beforeClose);
    await noPageOverflow(page);
  });
}

test('long dark code keeps highlighting, scrolls both axes, and wraps without losing text', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await articleReady(page);
  await page.evaluate(() => window.scrollTo(0, 350));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const lines = Array.from({ length: 120 }, (_, index) => `  line_${index}: ${'long_token_'.repeat(24)}`);
  const source = lines.join('\n');
  const html = lines
    .map(
      (line, index) =>
        `<span class="line${index === 0 ? ' line-highlight has-prompt' : ''}"${index === 0 ? ' data-prompt="$"' : ''}><span style="color:#24292e;--shiki-dark:rgb(230, 230, 230)">${line}</span></span>`,
    )
    .join('\n');
  await page.evaluate(
    async ({ source, html }) => {
      const modulePath = '/src/store/modal.ts';
      const { openModal } = await import(/* @vite-ignore */ modulePath);
      openModal('codeFullscreen', {
        code: source,
        codeHTML: html,
        language: 'typescript',
        preClassName: 'astro-code github-light github-dark',
        preStyle: 'background-color:#ffffff;color:#24292e;--shiki-dark:rgb(230, 230, 230);--shiki-dark-bg:rgb(30, 20, 40)',
        codeClassName: 'language-typescript',
      });
    },
    { source, html },
  );
  const panel = page.locator(codePanel);
  const pre = panel.locator('pre.code-fullscreen-content');
  await expect(pre).toBeVisible();
  expect(await pre.locator('code').textContent()).toBe(source);
  const styles = await pre.evaluate((element) => {
    const style = getComputedStyle(element);
    const line = element.querySelector('.line-highlight');
    const token = line?.firstElementChild;
    if (!line || !token) throw new Error('Missing highlighted line');
    return {
      dark: element.style.getPropertyValue('--shiki-dark'),
      darkBackground: element.style.getPropertyValue('--shiki-dark-bg'),
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      background: style.backgroundColor,
      tokenColor: getComputedStyle(token).color,
      markBorder: getComputedStyle(line).borderLeftWidth,
      prompt: getComputedStyle(line, '::before').content,
      horizontalOverflow: element.scrollWidth > element.clientWidth,
      verticalOverflow: element.scrollHeight > element.clientHeight,
    };
  });
  expect(styles.dark).toBe('rgb(230, 230, 230)');
  expect(styles.darkBackground).toBe('rgb(30, 20, 40)');
  expect(styles.fontSize).toBe('14px');
  expect(Number.parseFloat(styles.lineHeight)).toBeCloseTo(23.8, 1);
  expect(styles.background).not.toBe('rgb(255, 255, 255)');
  expect(styles.tokenColor).toBe('rgb(230, 230, 230)');
  expect(Number.parseFloat(styles.markBorder)).toBeGreaterThan(0);
  expect(styles.prompt).toContain('$');
  expect(styles.horizontalOverflow).toBe(true);
  expect(styles.verticalOverflow).toBe(true);

  await swipe(page, pre, 'x');
  await expect.poll(() => pre.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await swipe(page, pre, 'y');
  await expect.poll(() => pre.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  const wrap = panel.getByRole('button', { name: '自动换行', exact: true });
  await wrap.tap();
  await expect(wrap).toHaveAttribute('aria-pressed', 'true');
  expect(await pre.locator('code').textContent()).toBe(source);
  await expect.poll(() => pre.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await wrap.tap();
  await expect(wrap).toHaveAttribute('aria-pressed', 'false');
  expect(await pre.locator('code').textContent()).toBe(source);
  await noPageOverflow(page);
  await panel.getByRole('button', { name: '关闭', exact: true }).tap();
  await expect(panel).toHaveCount(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
});

type TouchPoint = { id: number; x: number; y: number };

async function diagramTouch(surface: Locator, type: string, points: TouchPoint[]) {
  await surface.evaluate(
    (element, { type, points }) => {
      const touches = points.map(({ id, x, y }) => new Touch({ identifier: id, target: element, clientX: x, clientY: y }));
      element.dispatchEvent(
        new TouchEvent(type, { touches, targetTouches: touches, changedTouches: touches, bubbles: true, cancelable: true }),
      );
    },
    { type, points },
  );
}

async function diagramTransform(diagram: Locator) {
  return diagram.evaluate((element) => {
    const matrix = new DOMMatrix(element.style.transform);
    return { x: matrix.e, y: matrix.f, scale: matrix.a };
  });
}

test('diagram pinch continues as a single-finger pan and touchcancel ends the gesture', async ({ page }) => {
  await articleReady(page);
  await page.evaluate(async () => {
    const modulePath = '/src/store/modal.ts';
    const { openModal } = await import(/* @vite-ignore */ modulePath);
    openModal('diagramFullscreen', {
      diagramType: 'mermaid',
      source: 'graph LR; A --> B',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="200" height="100" fill="pink"/></svg>',
    });
  });
  const diagram = page.locator('[role="dialog"] .mermaid-svg-container');
  await expect(diagram).toBeVisible();
  const surface = diagram.locator('..');
  await expect(surface).toHaveCSS('touch-action', 'none');
  await diagramTouch(surface, 'touchstart', [{ id: 1, x: 110, y: 210 }]);
  await diagramTouch(surface, 'touchmove', [{ id: 1, x: 140, y: 230 }]);
  await expect.poll(async () => (await diagramTransform(diagram)).x).toBeCloseTo(30, 0);
  await diagramTouch(surface, 'touchstart', [
    { id: 1, x: 140, y: 230 },
    { id: 2, x: 240, y: 230 },
  ]);
  await diagramTouch(surface, 'touchmove', [
    { id: 1, x: 120, y: 230 },
    { id: 2, x: 260, y: 230 },
  ]);
  await expect.poll(async () => (await diagramTransform(diagram)).scale).toBeCloseTo(1.4, 1);
  const beforePan = await diagramTransform(diagram);
  await diagramTouch(surface, 'touchend', [{ id: 1, x: 120, y: 230 }]);
  await diagramTouch(surface, 'touchmove', [{ id: 1, x: 135, y: 240 }]);
  await expect.poll(async () => (await diagramTransform(diagram)).x).toBeCloseTo(beforePan.x + 15, 0);
  await expect.poll(async () => (await diagramTransform(diagram)).y).toBeCloseTo(beforePan.y + 10, 0);
  const beforeCancel = await diagramTransform(diagram);
  await diagramTouch(surface, 'touchcancel', []);
  await diagramTouch(surface, 'touchmove', [{ id: 1, x: 220, y: 280 }]);
  await page.waitForTimeout(150);
  expect(await diagramTransform(diagram)).toEqual(beforeCancel);
  await page.getByRole('dialog').getByRole('button', { name: '关闭', exact: true }).tap();
  await expect(diagram).toHaveCount(0);
});

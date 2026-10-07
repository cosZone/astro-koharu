import { type CDPSession, expect, type Locator, type Page, test } from '@playwright/test';

const imageViewerModule = /\/ImageLightbox(?:\.[^/]+\.js|\.tsx)(?:\?.*)?$/;

const images = [
  { src: '/lightbox-fixture/first.svg', alt: '第一张测试图片' },
  { src: '/lightbox-fixture/second.svg', alt: '第二张测试图片' },
  { src: '/lightbox-fixture/third.svg', alt: '第三张测试图片' },
];
const fixture =
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#716088"/><circle cx="300" cy="200" r="60" fill="#f0cc87"/></svg>';
const portraitFixture =
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#716088"/><circle cx="300" cy="450" r="60" fill="#f0cc87"/></svg>';
const dialog = (page: Page) => page.getByRole('dialog', { name: '图片预览', exact: true });
const image = (page: Page) => dialog(page).locator('img[data-lightbox-image]');
const reset = (page: Page) => dialog(page).getByRole('button', { name: '重置缩放和旋转', exact: true });

async function expectPainted(page: Page) {
  // Visibility alone accepts opacity: 0. Wait for finite entrance animations to hand off their final styles first.
  await image(page).evaluate(async (element) => {
    const animations: Animation[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      animations.push(...node.getAnimations().filter((animation) => animation.effect?.getTiming().iterations !== Infinity));
      if (node.getAttribute('role') === 'dialog') break;
    }
    await Promise.allSettled(animations.map((animation) => animation.finished));
    await new Promise(requestAnimationFrame);
  });
  await expect
    .poll(() =>
      image(page).evaluate((element) => {
        let opacity = 1;
        for (let node: Element | null = element; node; node = node.parentElement) {
          opacity *= Number(getComputedStyle(node).opacity);
          if (node.getAttribute('role') === 'dialog') break;
        }
        return opacity;
      }),
    )
    .toBeGreaterThan(0.99);
}

async function ready(page: Page) {
  await page.route('**/lightbox-fixture/*.svg', async (route) => {
    if (route.request().url().endsWith('/broken.svg')) {
      await route.fulfill({ status: 404, body: '' });
    } else {
      await route.fulfill({
        contentType: 'image/svg+xml',
        body: route.request().url().endsWith('/second.svg') ? portraitFixture : fixture,
      });
    }
  });
  const response = await page.goto('/post/markdown-features', { waitUntil: 'domcontentloaded' });
  expect(response?.status(), 'The article route must compile before testing lightbox behavior').toBe(200);
  await page.waitForFunction(() => {
    const island = document.querySelector('astro-island[component-url*="ArticleViewers"]');
    return island && !island.hasAttribute('ssr');
  });
}

async function open(page: Page, currentIndex = 0, broken = false) {
  await page.evaluate(
    ({ images, currentIndex, broken }) => {
      const entries = broken ? [{ src: '/lightbox-fixture/broken.svg', alt: '加载失败测试图片' }, ...images] : images;
      window.dispatchEvent(
        new CustomEvent('open-image-lightbox', {
          detail: { ...entries[currentIndex], images: entries, currentIndex },
        }),
      );
    },
    { images, currentIndex, broken },
  );
  await expect(dialog(page)).toBeVisible();
  if (!broken) {
    await expect(image(page)).toBeVisible();
    await expect.poll(() => image(page).evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(600);
    await expect(reset(page)).toHaveText('100%');
    await expectPainted(page);
  }
}

async function center(target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error('Expected visible lightbox image');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

async function touch(session: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', points: TouchPoint[]) {
  await session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
}

async function doubleTap(session: CDPSession, point: { x: number; y: number }) {
  // Timestamp the native input itself: cross-process waits can exceed the double-tap window on a busy machine.
  const timestamp = Date.now() / 1000;
  for (const offset of [0, 0.12]) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...point, id: 1 }],
      timestamp: timestamp + offset,
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
      timestamp: timestamp + offset + 0.03,
    });
  }
}

async function swipe(page: Page, deltaX: number, deltaY: number) {
  const session = await page.context().newCDPSession(page);
  const start = await center(image(page));
  await touch(session, 'touchStart', [{ ...start, id: 1 }]);
  for (let step = 1; step <= 8; step++) {
    await touch(session, 'touchMove', [{ id: 1, x: start.x + (deltaX * step) / 8, y: start.y + (deltaY * step) / 8 }]);
    await page.waitForTimeout(16);
  }
  await touch(session, 'touchEnd', []);
  await session.detach();
}

test.beforeEach(async ({ page }) => ready(page));

test('article fullscreen opener loads its image and restores focus after Escape', async ({ page }) => {
  // Stub the actual article asset, so this exercises image-enhancer rather than a synthetic opener.
  await page.route('**/img/cover/3.webp', (route) => route.fulfill({ contentType: 'image/svg+xml', body: fixture }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const island = document.querySelector('astro-island[component-url*="ArticleViewers"]');
    return island && !island.hasAttribute('ssr');
  });
  const articleImage = page.locator('.custom-content img.markdown-image').first();
  await articleImage.scrollIntoViewIfNeeded();
  await expect(articleImage).toHaveClass(/loaded/);
  const opener = articleImage.locator('..').getByRole('button', { name: '全屏查看', exact: true });
  await opener.click();
  await expect(dialog(page)).toBeVisible();
  await expect(image(page)).toHaveAttribute('src', await articleImage.evaluate((element: HTMLImageElement) => element.src));
  await expect(image(page)).toHaveAttribute('alt', (await articleImage.getAttribute('alt')) ?? '');
  await expectPainted(page);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('the image viewer is fetched on first use and a slow load can be cancelled', async ({ page }) => {
  const viewerStatus = page.locator('[data-article-viewers]').getByRole('status');
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .some((entry) => /\/ImageLightbox(?:\.[^/]+\.js|\.tsx)(?:\?.*)?$/.test(entry.name)),
    ),
  ).toBe(false);
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(imageViewerModule, async (route) => {
    await pending;
    await route.continue();
  });
  await page.evaluate((images) => {
    window.dispatchEvent(new CustomEvent('open-image-lightbox', { detail: { ...images[0], images, currentIndex: 0 } }));
  }, images);
  await expect(viewerStatus).toHaveText('加载中...');
  await page.keyboard.press('Escape');
  await expect(viewerStatus).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  const response = page.waitForResponse(imageViewerModule);
  release?.();
  await response;
  await expect(dialog(page)).toHaveCount(0);
  await open(page);
});

test('a failed image viewer can be dismissed without blocking the code viewer', async ({ page }) => {
  const viewers = page.locator('[data-article-viewers]');
  await page.route(imageViewerModule, (route) => route.abort('failed'));
  await page.evaluate((images) => {
    window.dispatchEvent(new CustomEvent('open-image-lightbox', { detail: { ...images[0], images, currentIndex: 0 } }));
  }, images);
  await expect(viewers.getByRole('status')).toHaveText('查看器加载失败，请刷新页面重试。');
  await viewers.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(viewers.getByRole('status')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  const block = page.locator('.code-block-wrapper').first();
  await block.getByRole('button', { name: '全屏查看', exact: true }).last().click();
  await expect(page.locator('[role="dialog"]:has(pre.astro-code)')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[role="dialog"]:has(pre.astro-code)')).toHaveCount(0);
});

test('image clicks stay open, genuine empty-space clicks close, and dragging never dismisses', async ({ page }) => {
  await open(page);
  await image(page).click();
  await expect(dialog(page)).toBeVisible();
  const size = page.viewportSize();
  if (!size) throw new Error('Expected viewport');
  // Both ends lie on the stage outside the image; pointer travel must suppress the resulting click.
  await page.mouse.move(10, size.height / 2);
  await page.mouse.down();
  await page.mouse.move(30, size.height / 2 + 35, { steps: 6 });
  await page.mouse.up();
  await expect(dialog(page)).toBeVisible();
  await page.mouse.click(10, size.height / 2);
  await expect(dialog(page)).toHaveCount(0);
});

test('keyboard zoom is bounded from 100% to 500% and reset also clears rotation', async ({ page }) => {
  await open(page);
  await expect(dialog(page).getByRole('button', { name: '缩小', exact: true })).toBeDisabled();
  for (let count = 0; count < 8; count++) await page.keyboard.press('+');
  await expect(reset(page)).toHaveText('500%');
  await expect(dialog(page).getByRole('button', { name: '放大', exact: true })).toBeDisabled();
  await page.keyboard.press('-');
  await expect(reset(page)).toHaveText('333%');
  await page.keyboard.press('r');
  await expect
    .poll(() => image(page).evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).b))
    .toBeGreaterThan(0.99);
  await page.keyboard.press('0');
  await expect(reset(page)).toHaveText('100%');
  await expect
    .poll(() => image(page).evaluate((element) => Math.abs(new DOMMatrix(getComputedStyle(element).transform).b)))
    .toBeLessThan(0.01);
  for (let count = 0; count < 8; count++) await page.keyboard.press('-');
  await expect(reset(page)).toHaveText('100%');
  await page.keyboard.press('ArrowRight');
  await expect(image(page)).toHaveAttribute('alt', images[1].alt);
  await page.keyboard.press('ArrowLeft');
  await expect(image(page)).toHaveAttribute('alt', images[0].alt);
});

test('reopening after viewport resize fits and paints the new image', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  const original = page.viewportSize();
  if (!original) throw new Error('Expected viewport');
  const next = original.width > 600 ? { width: 390, height: 844 } : { width: 900, height: 420 };
  await page.setViewportSize(next);
  await open(page, 1);
  const box = await image(page).boundingBox();
  if (!box) throw new Error('Expected resized lightbox image');
  expect(box.width).toBeLessThanOrEqual(next.width * 0.9 + 1);
  expect(box.height).toBeLessThanOrEqual(next.height - (next.height <= 520 ? 144 : 192) + 1);
  expect(box.x).toBeGreaterThanOrEqual(15);
  expect(box.y).toBeGreaterThanOrEqual(71);
  expect(box.x + box.width).toBeLessThanOrEqual(next.width - 15);
  expect(box.y + box.height).toBeLessThanOrEqual(next.height - 71);
});

test('reduced motion still supports zoom, navigation, and immediate dismissal', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await dialog(page).getByRole('button', { name: '放大', exact: true }).click();
  await expect(reset(page)).toHaveText('150%');
  await dialog(page).getByRole('button', { name: '下一张', exact: true }).click();
  await expect(image(page)).toHaveAttribute('alt', images[1].alt);
  await expect(reset(page)).toHaveText('100%');
  await expect
    .poll(() =>
      image(page).evaluate((element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0),
    )
    .toBe(true);
  expect(
    await dialog(page).evaluate(
      (element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length,
    ),
  ).toBe(0);
  await dialog(page).getByRole('button', { name: '关闭', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
});

test('failed images report the error and navigation recovers without stale feedback', async ({ page }) => {
  await open(page, 0, true);
  await expect(dialog(page).getByText('图片加载失败', { exact: true })).toBeVisible();
  await dialog(page).getByRole('button', { name: '下一张', exact: true }).click();
  await expect(image(page)).toHaveAttribute('alt', images[0].alt);
  await expect(image(page)).toBeVisible();
  await expectPainted(page);
  await expect(dialog(page).getByText('图片加载失败', { exact: true })).toHaveCount(0);
});

test.describe('native touch gestures', () => {
  test.beforeEach(({ page }) => {
    test.skip(
      !page.context().browser()?.browserType() || !test.info().project.use.hasTouch,
      'Requires a touch-enabled Chromium context',
    );
  });

  test('double tap zooms in and resets without closing', async ({ page }) => {
    await open(page);
    const point = await center(image(page));
    const session = await page.context().newCDPSession(page);
    try {
      await doubleTap(session, point);
      await expect(reset(page)).toHaveText('250%');
      await expect(dialog(page)).toBeVisible();
      await page.waitForTimeout(350);
      await doubleTap(session, point);
      await expect(reset(page)).toHaveText('100%');
      await expect(dialog(page)).toBeVisible();
    } finally {
      await session.detach();
    }
  });

  test('pinch follows its moving midpoint and seamlessly continues as one-finger pan', async ({ page }) => {
    // The portrait image overflows both axes at 2×, so midpoint tracking is observable without reaching pan bounds.
    await open(page, 1);
    const initial = await center(image(page));
    const session = await page.context().newCDPSession(page);
    await touch(session, 'touchStart', [
      { id: 1, x: initial.x - 40, y: initial.y },
      { id: 2, x: initial.x + 40, y: initial.y },
    ]);
    for (let step = 1; step <= 8; step++) {
      await touch(session, 'touchMove', [
        { id: 1, x: initial.x - 40 - 5 * step + 3 * step, y: initial.y + 2 * step },
        { id: 2, x: initial.x + 40 + 5 * step + 3 * step, y: initial.y + 2 * step },
      ]);
      await page.waitForTimeout(16);
    }
    await expect(reset(page)).toHaveText('200%');
    await expect.poll(async () => Math.abs((await center(image(page))).x - initial.x - 24)).toBeLessThan(6);
    await expect.poll(async () => Math.abs((await center(image(page))).y - initial.y - 16)).toBeLessThan(6);
    const beforeRelease = await center(image(page));
    // CDP touchEnd points name the finger being lifted, while an empty list releases every finger.
    await touch(session, 'touchEnd', [{ id: 2, x: initial.x + 104, y: initial.y + 16 }]);
    await expect.poll(async () => Math.abs((await center(image(page))).x - beforeRelease.x)).toBeLessThan(3);
    await touch(session, 'touchMove', [{ id: 1, x: initial.x - 26, y: initial.y - 4 }]);
    await expect.poll(async () => Math.abs((await center(image(page))).x - beforeRelease.x - 30)).toBeLessThan(6);
    await expect.poll(async () => Math.abs((await center(image(page))).y - beforeRelease.y + 20)).toBeLessThan(6);
    await touch(session, 'touchEnd', []);
    await session.detach();
    await expect(dialog(page)).toBeVisible();
    await expect(reset(page)).toHaveText('200%');
  });

  test('horizontal swipes navigate and rebound at each boundary', async ({ page }) => {
    await open(page);
    const initial = await center(image(page));
    await swipe(page, 130, 0);
    await expect(image(page)).toHaveAttribute('alt', images[0].alt);
    await expect.poll(async () => Math.abs((await center(image(page))).x - initial.x)).toBeLessThan(2);
    await swipe(page, -130, 0);
    await expect(image(page)).toHaveAttribute('alt', images[1].alt);
    await swipe(page, -130, 0);
    await expect(image(page)).toHaveAttribute('alt', images[2].alt);
    await swipe(page, -130, 0);
    await expect(image(page)).toHaveAttribute('alt', images[2].alt);
    await expect.poll(async () => Math.abs((await center(image(page))).x - initial.x)).toBeLessThan(2);
    await expect(dialog(page)).toBeVisible();
  });

  test('downward swipe dismisses at fit scale but zoomed gestures only pan', async ({ page }) => {
    await open(page, 1);
    await dialog(page).getByRole('button', { name: '放大', exact: true }).tap();
    await expect(reset(page)).toHaveText('150%');
    await swipe(page, -130, 0);
    await expect(image(page)).toHaveAttribute('alt', images[1].alt);
    await swipe(page, 0, 150);
    await expect(dialog(page)).toBeVisible();
    await expect(reset(page)).toHaveText('150%');
    await reset(page).tap();
    await expect(reset(page)).toHaveText('100%');
    await swipe(page, 0, 150);
    await expect(dialog(page)).toHaveCount(0);
  });
});

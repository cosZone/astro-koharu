import { expect, type Page, test } from '@playwright/test';
import { activateToolbarButton, gotoReady } from './helpers';

async function reduceSystemMotion(page: Page) {
  await page.evaluate(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    document.documentElement.dataset.motionChangeDelivered = String(query.matches);
    if (!query.matches)
      query.addEventListener(
        'change',
        (event) => {
          document.documentElement.dataset.motionChangeDelivered = String(event.matches);
        },
        { once: true },
      );
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-motion-change-delivered', 'true');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

test('system reduce cancels an active segmented icon and snaps its gliding thumb', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/tests/motion/fixtures/segmented.tsx';
    const { mountSegmented } = await import(/* @vite-ignore */ path);
    mountSegmented();
  });
  const fixture = page.locator('#segmented-motion-fixture');
  const second = fixture.getByRole('button', { name: 'Second motion option', exact: true });
  await expect(second).toBeVisible();
  await second.click();
  const icon = second.locator('.segmented-icon');
  expect(
    await icon.evaluate(
      (element) =>
        element.getAnimations().filter((animation) => animation.constructor === Animation && animation.playState === 'running')
          .length,
    ),
  ).toBeGreaterThan(0);
  await reduceSystemMotion(page);
  expect(
    await icon.evaluate((element) => element.getAnimations().filter((animation) => animation.constructor === Animation).length),
  ).toBe(0);
  const thumb = fixture.locator('.segmented-thumb');
  await expect
    .poll(() =>
      thumb.evaluate((element) => {
        const selected = element.parentElement?.querySelector('[data-selected]');
        if (!selected) throw new Error('Missing selected segmented option');
        const actual = element.getBoundingClientRect();
        const target = selected.getBoundingClientRect();
        return Math.max(Math.abs(actual.left - target.left), Math.abs(actual.width - target.width));
      }),
    )
    .toBeLessThan(1);
  const settled = await thumb.getAttribute('style');
  await page.waitForTimeout(200);
  expect(await thumb.getAttribute('style')).toBe(settled);
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await fixture.getByRole('button', { name: 'First motion option', exact: true }).click();
  await expect(fixture.getByRole('button', { name: 'First motion option', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(
    await fixture
      .locator('.segmented-icon')
      .evaluateAll((elements) =>
        elements.reduce(
          (total, element) => total + element.getAnimations().filter((animation) => animation.constructor === Animation).length,
          0,
        ),
      ),
  ).toBe(0);
});

for (const reduceBeforeLoad of [true, false]) {
  test(`banner animation respects system reduce ${reduceBeforeLoad ? 'before its delayed load' : 'during its animation'}`, async ({
    page,
  }) => {
    let releaseImage: () => void = () => {};
    const imageHeld = new Promise<void>((resolve) => {
      releaseImage = resolve;
    });
    await page.route('**/img/site_header_*.webp', async (route) => {
      await imageHeld;
      await route.continue();
    });
    await page.addInitScript(() => {
      const add = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (type, listener, options) {
        if (this instanceof HTMLImageElement && this.parentElement?.id === 'banner-box' && type === 'load') {
          this.dataset.motionLoadListenerReady = 'true';
        }
        return add.call(this, type, listener, options);
      };
    });
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const banner = page.locator('#banner-box > img');
      await expect(banner).toHaveAttribute('data-motion-load-listener-ready', 'true');
      if (reduceBeforeLoad) await reduceSystemMotion(page);
      releaseImage();
      await expect
        .poll(() => banner.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0))
        .toBe(true);
      if (!reduceBeforeLoad) {
        expect(await banner.evaluate((image) => image.getAnimations().length)).toBeGreaterThan(0);
        await reduceSystemMotion(page);
      }
      expect(await banner.evaluate((image) => image.getAnimations().length)).toBe(0);
      await expect(banner).toHaveCSS('opacity', '1');
      await expect(banner).toHaveCSS('scale', 'none');
      await expect(banner).toBeVisible();
    } finally {
      releaseImage();
    }
  });
}

test('system reduce settles a settings panel that is already unfolding', async ({ page }) => {
  await gotoReady(page);
  await activateToolbarButton(page, page.locator('[data-settings-toggle]'));
  const panel = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: '关闭设置面板', exact: true }) });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: '关闭设置面板', exact: true }).click();
  await expect(panel).toBeHidden();
  await activateToolbarButton(page, page.locator('[data-settings-toggle]'));
  await expect
    .poll(() =>
      panel.evaluate((element) => element.getAnimations().filter((animation) => animation.playState === 'running').length),
    )
    .toBeGreaterThan(0);
  await reduceSystemMotion(page);
  expect(
    await panel.evaluate((element) => element.getAnimations().filter((animation) => animation.playState === 'running').length),
  ).toBe(0);
  await expect(panel).toHaveCSS('opacity', '1');
  expect(await panel.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).isIdentity)).toBe(true);
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: '关闭设置面板', exact: true }).click();
  await expect(panel).toBeHidden();
});

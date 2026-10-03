import { expect, type Page, test } from '@playwright/test';
import { activateToolbarButton, gotoReady } from './helpers';

interface Handoff {
  scope: string;
  property: string;
  before: string;
  after: string;
}

declare global {
  interface Window {
    motionHandoffs: Handoff[];
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.motionHandoffs = [];
    const cancel = Animation.prototype.cancel;
    Animation.prototype.cancel = function () {
      const effect = this.effect;
      const target = effect instanceof KeyframeEffect ? effect.target : null;
      const properties =
        this.playState === 'finished' && target instanceof HTMLElement && effect instanceof KeyframeEffect
          ? ['opacity', 'clipPath', 'filter', 'transform'].filter((property) =>
              effect.getKeyframes().some((frame) => property in frame),
            )
          : [];
      let scope = '';
      if (target instanceof HTMLElement) {
        if (target.closest('astro-island[component-url*="FloatingGroup"]')) scope = 'toolbar';
        if (target.closest('[role="dialog"].origin-bottom-right')) scope = 'settings';
        if (target.matches('.search-dialog, .z-54, .z-55')) scope = 'search';
        if (target.closest('.nav-popover')) scope = 'popover';
      }
      const before = target && scope ? getComputedStyle(target) : null;
      const values = properties.map((property) => ({
        property,
        before: before?.getPropertyValue(property === 'clipPath' ? 'clip-path' : property) ?? '',
      }));
      cancel.call(this);
      if (target?.isConnected && scope) {
        for (const value of values) {
          window.motionHandoffs.push({
            scope,
            ...value,
            after: getComputedStyle(target).getPropertyValue(value.property === 'clipPath' ? 'clip-path' : value.property),
          });
        }
      }
    };
  });
});

async function stableHandoffs(page: Page, scope: string, minimum: number) {
  await expect
    .poll(() => page.evaluate((scope) => window.motionHandoffs.filter((handoff) => handoff.scope === scope).length, scope))
    .toBeGreaterThanOrEqual(minimum);
  const handoffs = await page.evaluate((scope) => window.motionHandoffs.filter((handoff) => handoff.scope === scope), scope);
  for (const handoff of handoffs) {
    if (handoff.property === 'opacity') {
      expect(Math.abs(Number(handoff.before) - Number(handoff.after)), `${scope} opacity flashed`).toBeLessThan(0.01);
    } else {
      expect(handoff.after, `${scope} ${handoff.property} flashed`).toBe(handoff.before);
    }
  }
}

test('search layers and settings keep their completed appearance across repeated openings', async ({ page }) => {
  await gotoReady(page);
  for (let cycle = 0; cycle < 2; cycle++) {
    await page.evaluate(() => {
      window.motionHandoffs = [];
    });
    await page.locator('button[aria-label="搜索"][title]:visible').first().click();
    const search = page.getByRole('dialog', { name: '搜索文章', exact: true });
    await expect(search).toBeVisible();
    await stableHandoffs(page, 'search', 3);
    await page.keyboard.press('Escape');
    await expect(search).toHaveCount(0);
    await stableHandoffs(page, 'search', 3);

    await page.evaluate(() => {
      window.motionHandoffs = [];
    });
    await activateToolbarButton(page, page.locator('[data-settings-toggle]'));
    const settings = page.locator('[role="dialog"].origin-bottom-right');
    await expect(settings).toBeVisible();
    await stableHandoffs(page, 'settings', 2);
    await settings.getByRole('button', { name: '关闭设置面板', exact: true }).click();
    await expect(settings).toHaveCount(0);
    await stableHandoffs(page, 'settings', 2);
  }
});

test('desktop language popover keeps its completed fade and transform', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The language menu is displayed in the desktop header.');
  await gotoReady(page);
  const trigger = page.getByRole('button', { name: /^Language:/ });
  for (let cycle = 0; cycle < 2; cycle++) {
    await page.evaluate(() => {
      window.motionHandoffs = [];
    });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const popover = page.locator('[role="dialog"].nav-popover');
    await expect(popover).toBeVisible();
    await stableHandoffs(page, 'popover', 2);
    await page.keyboard.press('Escape');
    await expect(popover).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test('toolbar entries keep their completed appearance after reopening', async ({ page }) => {
  await gotoReady(page);
  const trigger = page.getByRole('button', { name: '展开/收起工具栏', exact: true });
  await activateToolbarButton(page, trigger);
  await expect(page.locator('[data-settings-toggle]')).toHaveCount(0);
  await page.evaluate(() => {
    window.motionHandoffs = [];
  });
  await activateToolbarButton(page, trigger);
  await expect(page.locator('[data-settings-toggle]')).toBeVisible();
  await stableHandoffs(page, 'toolbar', 2);
});

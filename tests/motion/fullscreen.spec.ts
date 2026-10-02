import { expect, type Page, test } from '@playwright/test';

interface FadeCompletion {
  layer: 'panel' | 'backdrop';
  before: number;
  after: number;
}

declare global {
  interface Window {
    fullscreenFades: FadeCompletion[];
  }
}

const panelSelector = '[role="dialog"]:has(pre.astro-code)';

async function observeFullscreenFades(page: Page) {
  await page.addInitScript(() => {
    window.fullscreenFades = [];
    const cancel = Animation.prototype.cancel;
    // Observe the actual handoff from a finished browser animation to inline styles.
    // rAF alone can miss the single frame in which the initial opacity is exposed.
    Animation.prototype.cancel = function () {
      const effect = this.effect;
      const target = effect instanceof KeyframeEffect ? effect.target : null;
      const panel = '[role="dialog"]:has(pre.astro-code)';
      const isPanel = target instanceof HTMLElement && target.matches(panel);
      const isBackdrop =
        target instanceof HTMLElement &&
        target.classList.contains('backdrop-blur-sm') &&
        target.parentElement?.querySelector(panel);
      const observe =
        (isPanel || isBackdrop) &&
        this.playState === 'finished' &&
        effect instanceof KeyframeEffect &&
        effect.getKeyframes().some((frame) => 'opacity' in frame);
      const before = observe && target ? Number(getComputedStyle(target).opacity) : 0;
      cancel.call(this);
      if (observe && target?.isConnected) {
        window.fullscreenFades.push({
          layer: isPanel ? 'panel' : 'backdrop',
          before,
          after: Number(getComputedStyle(target).opacity),
        });
      }
    };
  });
}

for (const theme of ['light', 'dark']) {
  test(`code fullscreen keeps its final opacity when opening and closing (${theme})`, async ({ page }) => {
    await page.addInitScript((theme) => {
      localStorage.setItem('theme', theme);
      localStorage.setItem('site-motion-level', 'lively');
    }, theme);
    await observeFullscreenFades(page);
    await page.goto('/post/markdown-features', { waitUntil: 'domcontentloaded' });

    for (const index of [0, 1, 3, 0]) {
      const block = page.locator('.code-block-wrapper').nth(index);
      const button = block.getByRole('button', { name: '全屏查看', exact: true }).last();
      await page.evaluate(() => {
        window.fullscreenFades = [];
      });
      await button.click();
      const panel = page.locator(panelSelector);
      await expect(panel).toBeVisible();
      await expect(panel.locator('code')).toHaveText(await block.locator('pre code').innerText());
      await expect.poll(() => page.evaluate(() => window.fullscreenFades.length)).toBeGreaterThanOrEqual(2);
      const entrance = await page.evaluate(() => window.fullscreenFades);
      expect(entrance.map(({ layer }) => layer).sort()).toEqual(['backdrop', 'panel']);
      for (const fade of entrance) {
        expect(fade.after, `${fade.layer} must stay visible when its native animation ends`).toBeGreaterThan(0.99);
      }

      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
      const completions = await page.evaluate(() => window.fullscreenFades);
      for (const fade of completions) {
        expect(Math.abs(fade.before - fade.after), `${fade.layer} flashed at animation completion`).toBeLessThan(0.01);
      }
      await expect(button).toBeFocused();
    }
  });
}

test('code fullscreen remains operable with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/post/markdown-features', { waitUntil: 'domcontentloaded' });
  const button = page.locator('.code-block-wrapper').first().getByRole('button', { name: '全屏查看', exact: true }).last();
  await button.click();
  const panel = page.locator(panelSelector);
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS('opacity', '1');
  expect(await panel.evaluate((element) => element.getAnimations().length)).toBe(0);
  await panel.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect(button).toBeFocused();
});

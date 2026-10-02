import { expect, test } from '@playwright/test';

test('snowfall releases rendering on reduced motion and bounds normal rendering cost', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    let draws = 0;
    Object.defineProperty(window, '__snowDraws', { get: () => draws });
    const proto = WebGL2RenderingContext.prototype;
    const draw = proto.drawElements;
    proto.drawElements = function (...args) {
      draws++;
      return draw.apply(this, args);
    };
  });
  await page.goto('/');
  await page.evaluate(async () => {
    // This integration fixture uses Vite so the production configuration needn't enable Christmas.
    const path = '/tests/motion/fixtures/snowfall.tsx';
    const { mountSnowfall } = await import(/* @vite-ignore */ path);
    mountSnowfall();
  });
  await expect(page.locator('#snowfall-fixture')).toHaveCount(1);
  await expect(page.locator('#snowfall-fixture canvas')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const canvas = page.locator('#snowfall-fixture canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, '__snowDraws'))).toBeGreaterThan(0);
  const sample = await page.evaluate(async () => {
    const before = Reflect.get(window, '__snowDraws') as number;
    const start = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { draws: (Reflect.get(window, '__snowDraws') as number) - before, elapsed: performance.now() - start };
  });
  expect(sample.draws).toBeGreaterThan(0);
  expect(sample.draws / (sample.elapsed / 1000)).toBeLessThanOrEqual(32);

  await page.setViewportSize({ width: 3200, height: 1800 });
  await expect.poll(() => canvas.evaluate((el: HTMLCanvasElement) => el.width)).toBeLessThanOrEqual(1920);
  await expect.poll(() => canvas.evaluate((el: HTMLCanvasElement) => el.height)).toBeLessThanOrEqual(1080);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveCount(0);
  const stopped = await page.evaluate(async () => {
    // Allow Fiber's unmount cleanup to finish before measuring idle work.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const before = Reflect.get(window, '__snowDraws') as number;
    await new Promise((resolve) => setTimeout(resolve, 200));
    return (Reflect.get(window, '__snowDraws') as number) - before;
  });
  expect(stopped).toBe(0);
});

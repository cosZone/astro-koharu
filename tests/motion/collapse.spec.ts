import { expect, test } from '@playwright/test';

test('collapse animations settle in the requested state when motion is disabled mid-flight', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const animationPath = '/src/lib/collapse-animation.ts';
    const settingsPath = '/src/store/settings.ts';
    const { setupCollapseAnimations } = await import(/* @vite-ignore */ animationPath);
    const { setMotionLevel } = await import(/* @vite-ignore */ settingsPath);
    const host = document.createElement('div');
    host.innerHTML =
      '<details class="collapse-block"><summary>Collapse regression</summary><div class="collapse-content">Still readable after stopping motion</div></details>';
    document.body.append(host);
    setupCollapseAnimations(host);
    const details = host.querySelector('details');
    const summary = host.querySelector('summary');
    const content = host.querySelector<HTMLElement>('.collapse-content');
    if (!details || !summary || !content) throw new Error('Missing collapse fixture');
    const states = [];
    for (const open of [true, false]) {
      setMotionLevel('lively');
      summary.click();
      const wasAnimating = content.getAnimations().length > 0;
      setMotionLevel('reduced');
      await Promise.resolve();
      states.push({
        expectedOpen: open,
        open: details.open,
        wasAnimating,
        remainingAnimations: content.getAnimations().length,
        overflow: content.style.overflow,
      });
    }
    // Let a stale onfinish callback run if cleanup failed.
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { states, finalOpen: details.open };
  });
  for (const state of results.states) {
    expect(state.wasAnimating).toBe(true);
    expect(state.open).toBe(state.expectedOpen);
    expect(state.remainingAnimations).toBe(0);
    expect(state.overflow).toBe('');
  }
  expect(results.finalOpen).toBe(false);
});

test('native system preference changes settle active expand and collapse animations', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const animationPath = '/src/lib/collapse-animation.ts';
    const { setupCollapseAnimations } = await import(/* @vite-ignore */ animationPath);
    const host = document.createElement('div');
    host.id = 'native-collapse-fixture';
    host.innerHTML =
      '<details class="collapse-block"><summary>Native preference collapse</summary><div class="collapse-content">Readable native preference content</div></details>';
    document.body.append(host);
    setupCollapseAnimations(host);
  });
  const details = page.locator('#native-collapse-fixture details');
  const content = details.locator('.collapse-content');
  for (const open of [true, false]) {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await details.locator('summary').click();
    expect(await content.evaluate((element) => element.getAnimations().length)).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    expect(await content.evaluate((element) => element.getAnimations().length)).toBe(0);
    expect(await details.evaluate((element: HTMLDetailsElement) => element.open)).toBe(open);
    expect(await content.evaluate((element: HTMLElement) => element.style.overflow)).toBe('');
  }
  await page.waitForTimeout(300);
  expect(await details.evaluate((element: HTMLDetailsElement) => element.open)).toBe(false);
});

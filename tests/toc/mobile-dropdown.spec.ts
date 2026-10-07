import { expect, type Locator, type Page, test } from '@playwright/test';

const triggerName = '展开目录';
const panelSelector = '[data-floating-ui-portal] [role="dialog"]';

async function articleReady(page: Page) {
  await page.goto('/post/note/shoka-features', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const island = document.querySelector('astro-island[component-export="MobilePostHeader"]');
    return island && !island.hasAttribute('ssr');
  });
  await page
    .locator('article h2')
    .nth(6)
    .evaluate((heading) => {
      window.scrollTo({ top: heading.getBoundingClientRect().top + window.scrollY - 110, behavior: 'instant' });
    });
  await expect(page.getByRole('button', { name: triggerName, exact: true })).toBeVisible();
}

async function openWithoutFlicker(page: Page, trigger: Locator, expectImmediate = false) {
  const scrollBeforeOpen = await page.evaluate(() => window.scrollY);
  // Sample computed styles throughout the reveal, including after each property finishes.
  // Checking only the final open state misses the single-frame return to hidden styles.
  const recording = page.evaluate(async (name) => {
    const samples: { expanded: string | null; opacity: number; reveal: number; scrollY: number }[] = [];
    const trigger = document.querySelector(`button[aria-label="${name}"]`);
    return new Promise<typeof samples>((resolve, reject) => {
      const deadline = performance.now() + 5000;
      let openedAt = 0;
      const sample = () => {
        const panel = document.querySelector('[data-floating-ui-portal] [role="dialog"]');
        if (panel) {
          if (!openedAt) openedAt = performance.now();
          const style = getComputedStyle(panel);
          const insets = style.clipPath
            .match(/^inset\(([^)]+?)(?:\s+round|\))/)?.[1]
            .trim()
            .split(/\s+/)
            .map(Number.parseFloat);
          const [top = 0, right = top, bottom = top, left = right] = insets ?? [];
          samples.push({
            expanded: trigger?.getAttribute('aria-expanded') ?? null,
            opacity: Number(style.opacity),
            reveal: ((100 - top - bottom) * (100 - left - right)) / 10_000,
            scrollY: window.scrollY,
          });
        }
        if (openedAt && performance.now() - openedAt >= 1000) resolve(samples);
        else if (performance.now() > deadline) reject(new Error('The mobile TOC did not open'));
        else requestAnimationFrame(sample);
      };
      sample();
    });
  }, triggerName);
  await trigger.tap();
  const samples = await recording;
  expect(samples.length).toBeGreaterThan(expectImmediate ? 0 : 10);
  for (const sample of samples) {
    expect(sample.expanded, 'The dropdown must stay open during its reveal').toBe('true');
    expect(sample.scrollY, 'Opening the TOC must not scroll the article').toBe(scrollBeforeOpen);
  }
  if (expectImmediate) {
    // Browsers may throttle frames when reduced motion leaves nothing animating.
    for (const sample of samples) {
      expect(sample.opacity).toBe(1);
      expect(sample.reveal).toBe(1);
    }
  }
  for (let index = 1; index < samples.length; index++) {
    expect(samples[index].opacity, `Opacity flashed backward at frame ${index}`).toBeGreaterThanOrEqual(
      samples[index - 1].opacity - 0.02,
    );
    expect(samples[index].reveal, `The clip reveal collapsed at frame ${index}`).toBeGreaterThanOrEqual(
      samples[index - 1].reveal - 0.02,
    );
  }
  expect(samples.at(-1)?.opacity).toBe(1);
  expect(samples.at(-1)?.reveal).toBe(1);
  const panel = page.locator(panelSelector);
  await expect(panel.locator('[aria-current="location"]')).toBeFocused();
  return panel;
}

for (const viewport of [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`touch reveal stays visible at ${viewport.width}×${viewport.height}`, async ({ page, isMobile }, testInfo) => {
    test.skip(!isMobile, 'This case requires mobile touch input.');
    await page.setViewportSize(viewport);
    await articleReady(page);
    const trigger = page.getByRole('button', { name: triggerName, exact: true });
    for (let cycle = 0; cycle < 3; cycle++) {
      const panel = await openWithoutFlicker(page, trigger);
      const box = await panel.boundingBox();
      if (!box) throw new Error('Missing TOC panel');
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
      if (cycle === 0) await page.screenshot({ path: testInfo.outputPath('toc-open.png') });
      await trigger.tap();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(panel).toHaveCount(0);
    }
    const panel = await openWithoutFlicker(page, trigger);
    await panel.locator('[aria-current="location"]').tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toHaveCount(0);
  });
}

test('reduced motion opens immediately and still dismisses', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This case requires mobile touch input.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await articleReady(page);
  const trigger = page.getByRole('button', { name: triggerName, exact: true });
  await openWithoutFlicker(page, trigger, true);
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator(panelSelector)).toHaveCount(0);
});

test('mobile keyboard opening and desktop TOC remain usable', async ({ page, isMobile }) => {
  test.skip(isMobile, 'This case uses a desktop keyboard and breakpoint changes.');
  await page.setViewportSize({ width: 390, height: 844 });
  await articleReady(page);
  const trigger = page.getByRole('button', { name: triggerName, exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const panel = page.locator(panelSelector);
  await expect(panel).toBeVisible();
  await expect(panel.locator('[aria-current="location"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(trigger).toHaveCount(0);
  await expect(page.locator('nav.toc-container:visible [aria-current="location"]').first()).toBeVisible();
});

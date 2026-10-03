import { expect, test } from '@playwright/test';

test('native Motion animations keep their final appearance when each property finishes', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const originalAnimate = Element.prototype.animate;
    let nativeAnimations = 0;
    Element.prototype.animate = function (keyframes, options) {
      if (this.hasAttribute('data-motion-completion')) nativeAnimations++;
      return originalAnimate.call(this, keyframes, options);
    };
    const path = '/tests/motion/fixtures/completion.tsx';
    const { mountCompletionFixture } = await import(/* @vite-ignore */ path);
    const dispose = mountCompletionFixture();
    const samples: Record<string, number[]> = {};
    try {
      await new Promise<void>((resolve, reject) => {
        const deadline = performance.now() + 5000;
        let mountedAt = 0;
        const sample = () => {
          for (const element of document.querySelectorAll('[data-motion-completion]')) {
            if (!mountedAt) mountedAt = performance.now();
            const property = element.getAttribute('data-motion-completion');
            if (!property) continue;
            const style = getComputedStyle(element);
            let visible = 0;
            if (property === 'opacity') visible = Number(style.opacity);
            if (property === 'filter') visible = 1 - Number.parseFloat(style.filter.slice(5)) / 6;
            if (property === 'transform') visible = 1 - new DOMMatrix(style.transform).m42 / 20;
            if (property === 'clip-path') {
              const insets =
                style.clipPath
                  .match(/^inset\(([^)]+)\)/)?.[1]
                  .split(/\s+/)
                  .map(Number.parseFloat) ?? [];
              visible = 1 - insets.reduce((total, value) => total + value, 0) / 133;
            }
            samples[property] ??= [];
            samples[property].push(visible);
          }
          if (mountedAt && performance.now() - mountedAt >= 1000) resolve();
          else if (performance.now() >= deadline) reject(new Error('Completion fixtures did not mount'));
          else requestAnimationFrame(sample);
        };
        sample();
      });
      return { samples, nativeAnimations };
    } finally {
      dispose();
      Element.prototype.animate = originalAnimate;
    }
  });
  expect(result.nativeAnimations, 'Keep native acceleration enabled').toBe(4);
  expect(Object.keys(result.samples)).toHaveLength(4);
  for (const [property, samples] of Object.entries(result.samples)) {
    expect(samples.length).toBeGreaterThan(10);
    for (let index = 1; index < samples.length; index++) {
      expect
        .soft(samples[index], `${property} flashed backward at frame ${index}`)
        .toBeGreaterThanOrEqual(samples[index - 1] - 0.02);
    }
    expect(samples.at(-1)).toBe(1);
  }
});

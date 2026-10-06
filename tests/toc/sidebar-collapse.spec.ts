import { expect, type Page, test } from '@playwright/test';

const navSelector = 'nav.toc-container:visible';

async function scrollToHeading(page: Page, id: string) {
  await page.evaluate((headingId) => {
    const heading = document.getElementById(headingId);
    if (!heading) throw new Error(`Missing article heading: ${headingId}`);
    window.scrollTo({ top: heading.getBoundingClientRect().top + window.scrollY - 110, behavior: 'instant' });
  }, id);
}

for (const reverse of [false, true]) {
  test(`closing a chapter keeps the ribbon attached${reverse ? ' when reversed mid-flight' : ''}`, async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'The sidebar is visible at desktop widths.');
    await page.goto('/post/note/shoka-features', { waitUntil: 'domcontentloaded' });
    const nav = page.locator(navSelector);
    const child = nav.locator('[data-toc-row="视频"]');
    await expect(child).toBeAttached();
    await scrollToHeading(page, '视频');
    await expect(child).toHaveAttribute('aria-current', 'location');
    const group = child.locator('xpath=ancestor::div[@class="heading-children silk-heading-children"][1]');
    await expect(group).toHaveAttribute('data-open');
    await page.waitForTimeout(800);

    const result = await nav.evaluate(async (element, reverse) => {
      const child = element.querySelector<HTMLElement>('[data-toc-row="音频"]');
      const node = child?.querySelector('.toc-node');
      const group = child?.closest<HTMLElement>('.silk-heading-children');
      const inner = group?.querySelector<HTMLElement>('.silk-heading-children-inner');
      const thread = element.querySelector<SVGPathElement>('.toc-ribbon-thread');
      const heading = document.getElementById('练习题');
      if (!child || !node || !group || !inner || !thread || !heading) throw new Error('Missing sidebar collapse fixture');
      const samples: { closed: boolean; height: number; opacity: number; laneError: number }[] = [];
      const originalHeight = inner.getBoundingClientRect().height;
      const started = performance.now();
      window.scrollTo({ top: heading.getBoundingClientRect().top + window.scrollY - 110, behavior: 'instant' });
      if (reverse) {
        setTimeout(() => {
          const previous = document.getElementById('视频');
          if (!previous) throw new Error('Missing previous article heading');
          window.scrollTo({ top: previous.getBoundingClientRect().top + window.scrollY - 110, behavior: 'instant' });
        }, 120);
      }
      return new Promise<{ samples: typeof samples; originalHeight: number }>((resolve) => {
        const sample = () => {
          const navBox = element.getBoundingClientRect();
          const childBox = child.getBoundingClientRect();
          const nodeBox = node.getBoundingClientRect();
          const targetY = childBox.top + childBox.height / 2 - navBox.top + element.scrollTop;
          let low = 0;
          let high = thread.getTotalLength();
          for (let i = 0; i < 18; i++) {
            const mid = (low + high) / 2;
            if (thread.getPointAtLength(mid).y < targetY) low = mid;
            else high = mid;
          }
          const point = thread.getPointAtLength((low + high) / 2);
          samples.push({
            closed: !group.hasAttribute('data-open'),
            height: inner.getBoundingClientRect().height,
            opacity: Number(getComputedStyle(inner).opacity),
            laneError: Math.abs(point.x - (nodeBox.left + nodeBox.width / 2 - navBox.left)),
          });
          if (performance.now() - started >= 700) resolve({ samples, originalHeight });
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
    }, reverse);
    const { samples, originalHeight } = result;
    const closing = samples.filter((sample) => sample.closed && sample.height > 40 && sample.opacity > 0.1);
    expect(closing.length, 'The real collapse must include visible intermediate frames').toBeGreaterThan(2);
    expect(
      Math.max(...closing.map((sample) => sample.laneError)),
      'The ribbon must stay in the child lane until the child is clipped away',
    ).toBeLessThan(3);
    expect(samples.at(-1)?.height).toBeCloseTo(reverse ? originalHeight : 0, 0);
  });
}

test('reduced motion folds immediately and keeps the current marker in its row', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The sidebar is visible at desktop widths.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/post/note/shoka-features', { waitUntil: 'domcontentloaded' });
  const nav = page.locator(navSelector);
  const child = nav.locator('[data-toc-row="视频"]');
  await expect(child).toBeAttached();
  await scrollToHeading(page, '视频');
  await expect(child).toHaveAttribute('aria-current', 'location');
  await scrollToHeading(page, '练习题');
  await expect(nav.locator('[data-toc-row="练习题"]')).toHaveAttribute('aria-current', 'location');
  const geometry = await nav.evaluate((element) => {
    const child = element.querySelector('[data-toc-row="视频"]');
    const group = child?.closest('.silk-heading-children');
    const current = element.querySelector('[data-toc-row="练习题"]');
    const petal = element.querySelector('.toc-petal');
    if (!group || !current || !petal) throw new Error('Missing reduced-motion fixture');
    const box = current.getBoundingClientRect();
    const marker = petal.getBoundingClientRect();
    return {
      height: group.getBoundingClientRect().height,
      inert: group.hasAttribute('inert'),
      rowTop: box.top,
      rowBottom: box.bottom,
      petalY: marker.top + marker.height / 2,
      transitions: element.getAnimations({ subtree: true }).filter((animation) => animation instanceof CSSTransition).length,
    };
  });
  expect(geometry.height).toBe(0);
  expect(geometry.inert).toBe(true);
  expect(geometry.transitions).toBe(0);
  expect(geometry.petalY).toBeGreaterThanOrEqual(geometry.rowTop - 1);
  expect(geometry.petalY).toBeLessThanOrEqual(geometry.rowBottom + 1);
});

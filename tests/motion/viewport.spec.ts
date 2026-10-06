import { expect, type Page, test } from '@playwright/test';

test('cover geometry stays stable as the mobile dynamic viewport changes', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile browser controls change the dynamic viewport independently of the small viewport.');
  const cdp = await page.context().newCDPSession(page);
  await page.goto('/post/getting-started');
  await page.waitForFunction(() => customElements.get('sakura-petals'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2000);
  // CDP applies height and the svh difference in separate messages. Prevent its
  // intermediate state from anchoring the scroll before checking the final geometry.
  await page.addStyleTag({ content: 'html { overflow-anchor: none; }' });
  await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.id = 'small-viewport-probe';
    probe.style.cssText = 'position:fixed;width:0;height:100svh;pointer-events:none';
    document.body.append(probe);
    window.scrollTo({ top: 600, behavior: 'instant' });
  });
  const geometry = () =>
    page.evaluate(() => {
      const article = document.querySelector('article')?.getBoundingClientRect();
      const cover = document.querySelector('.cover-hero')?.getBoundingClientRect();
      const wave = document.querySelector('.wave-wrap')?.getBoundingClientRect();
      const copy = document.querySelector('.cover-copy');
      if (!article || !cover || !wave || !copy) throw new Error('Article cover is missing');
      return {
        articleTop: article.top + window.scrollY,
        coverHeight: cover.height,
        waveHeight: wave.height,
        copyBottom: getComputedStyle(copy).bottom,
      };
    });
  const initial = await geometry();
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required');
  const smallHeight = viewport.height;
  // CDP has no real browser toolbar. Keep svh fixed while sweeping dvh, instead of
  // treating a normal viewport resize (where both units change) as toolbar emulation.
  for (const [index, delta] of [0, 20, 40, 60, 80, 60, 40, 20, 0].entries()) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), 600 + index * 20);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: smallHeight + delta,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await cdp.send('Emulation.setSmallViewportHeightDifferenceOverride', { difference: delta });
    await expect(page.locator('#small-viewport-probe')).toHaveCSS('height', `${smallHeight}px`);
    await expect.poll(geometry).toEqual(initial);
    expect(await page.evaluate(() => window.scrollY)).toBe(600 + index * 20);
  }
});

test('cover responds to a real window resize and orientation change', async ({ page, isMobile }) => {
  await page.goto('/post/getting-started');
  const height = () => page.locator('.cover-hero').evaluate((el) => el.getBoundingClientRect().height);
  const initial = await height();
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required');
  await page.setViewportSize(
    isMobile ? { width: viewport.height, height: viewport.width } : { width: viewport.width, height: viewport.height - 200 },
  );
  await expect.poll(height).not.toBe(initial);
  await expect.poll(height).toBeCloseTo((isMobile ? viewport.width : viewport.height - 200) * 0.6, 1);
});

async function directoryReady(page: Page) {
  await page.goto('/post/getting-started', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const navigator = document.querySelector('astro-island[component-url*="Navigator"]');
    const toc = document.querySelector('.page-home-sider [data-toc-row]');
    return navigator && !navigator.hasAttribute('ssr') && toc;
  });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo({ top: 1000, behavior: 'instant' }));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  await expect(page.locator('#site-header')).not.toHaveClass(/-translate-y-full/);
  await page.waitForTimeout(600);
}

async function recordDirectoryMotion(page: Page, scrollTop: number, reverseAfter = 0) {
  return page.evaluate(
    async ({ scrollTop, reverseAfter }) => {
      const sider = document.querySelector<HTMLElement>('.page-home-sider');
      const article = document.querySelector('article');
      const header = document.getElementById('site-header');
      if (!sider || !article || !header) throw new Error('Missing desktop directory fixture');
      const footer = sider.querySelector('.series-progress');
      const before = sider.getBoundingClientRect();
      const articleTop = article.getBoundingClientRect().top + window.scrollY;
      const footerBottom = footer?.getBoundingClientRect().bottom;
      const initialScroll = window.scrollY;
      let expectedScroll = scrollTop;
      const started = performance.now();
      const samples: {
        top: number;
        bottom: number;
        footerBottom?: number;
        articleTop: number;
        scrollY: number;
        expectedScroll: number;
        hidden: boolean;
      }[] = [];
      window.scrollTo({ top: scrollTop, behavior: 'instant' });
      let reversed = false;
      return new Promise<{ initialTop: number; articleTop: number; footerBottom?: number; samples: typeof samples }>(
        (resolve) => {
          const sample = () => {
            if (reverseAfter && !reversed && performance.now() - started >= reverseAfter) {
              reversed = true;
              expectedScroll = initialScroll;
              window.scrollTo({ top: initialScroll, behavior: 'instant' });
            }
            const box = sider.getBoundingClientRect();
            samples.push({
              top: box.top,
              bottom: box.bottom,
              footerBottom: footer?.getBoundingClientRect().bottom,
              articleTop: article.getBoundingClientRect().top + window.scrollY,
              scrollY: window.scrollY,
              expectedScroll,
              hidden: header.classList.contains('-translate-y-full'),
            });
            if (performance.now() - started >= 850) resolve({ initialTop: before.top, articleTop, footerBottom, samples });
            else requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        },
      );
    },
    { scrollTop, reverseAfter },
  );
}

function expectStableArticle(result: Awaited<ReturnType<typeof recordDirectoryMotion>>) {
  for (const sample of result.samples) {
    expect(sample.scrollY, 'Animating the directory must not scroll the article').toBe(sample.expectedScroll);
    expect(sample.articleTop, 'Animating the directory must not move article layout').toBe(result.articleTop);
    expect(sample.bottom, 'The sticky directory must keep its bottom at the viewport edge').toBeCloseTo(900, 0);
    if (result.footerBottom !== undefined) expect(sample.footerBottom).toBeCloseTo(result.footerBottom, 0);
  }
}

test('desktop directory glides upward with the hiding header and returns on reveal', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The sticky directory is displayed on desktop.');
  await directoryReady(page);
  const hiding = await recordDirectoryMotion(page, 950);
  expect(hiding.initialTop).toBeCloseTo(68, 0);
  expect(hiding.samples.at(-1)?.hidden).toBe(true);
  expect(hiding.samples.at(-1)?.top, 'The directory must fill the space released by the header').toBeCloseTo(0, 0);
  expect(hiding.samples.filter(({ top }) => top > 1 && top < 67).length).toBeGreaterThan(2);
  expectStableArticle(hiding);
  const revealing = await recordDirectoryMotion(page, 900);
  expect(revealing.samples.at(-1)?.hidden).toBe(false);
  expect(revealing.samples.at(-1)?.top).toBeCloseTo(68, 0);
  expect(revealing.samples.filter(({ top }) => top > 1 && top < 67).length).toBeGreaterThan(2);
  expectStableArticle(revealing);
});

test('desktop directory reverses smoothly when scrolling changes direction', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The sticky directory is displayed on desktop.');
  await directoryReady(page);
  const result = await recordDirectoryMotion(page, 950, 160);
  expect(result.samples.some(({ hidden }) => hidden)).toBe(true);
  expect(result.samples.at(-1)?.hidden).toBe(false);
  expect(result.samples.at(-1)?.top).toBeCloseTo(68, 0);
  expect(result.samples.filter(({ top }) => top > 1 && top < 67).length).toBeGreaterThan(2);
  expectStableArticle(result);
});

for (const preference of ['reduce', 'off'] as const) {
  test(`desktop directory follows the header immediately with motion ${preference}`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'The sticky directory is displayed on desktop.');
    if (preference === 'reduce') await page.emulateMedia({ reducedMotion: 'reduce' });
    await directoryReady(page);
    if (preference === 'off') await page.evaluate(() => document.documentElement.classList.add('motion-off'));
    const result = await recordDirectoryMotion(page, 950);
    expect(result.samples.at(-1)?.top).toBeCloseTo(0, 0);
    expect(result.samples.filter(({ top }) => top > 1 && top < 67)).toHaveLength(0);
    expectStableArticle(result);
  });
}

test('directory motion stays stable before pinning and at the end of the page', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The sticky directory is displayed on desktop.');
  await directoryReady(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(600);
  const beforeStickyScroll = await page
    .locator('.page-home-sider')
    .evaluate((element) => Math.round(element.getBoundingClientRect().top + window.scrollY - 100));
  const beforeSticky = await recordDirectoryMotion(page, beforeStickyScroll);
  const naturalTop = beforeSticky.samples[0].top;
  expect(naturalTop).toBeGreaterThan(68);
  for (const sample of beforeSticky.samples) {
    expect(sample.top).toBeCloseTo(naturalTop, 1);
    expect(sample.scrollY).toBe(beforeStickyScroll);
    expect(sample.articleTop).toBe(beforeSticky.articleTop);
  }
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), maxScroll);
  await page.waitForTimeout(500);
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), maxScroll - 100);
  await page.waitForTimeout(600);
  const atEnd = await recordDirectoryMotion(page, maxScroll - 50);
  const bottom = atEnd.samples[0].bottom;
  expect(bottom).toBeLessThanOrEqual(900);
  for (const sample of atEnd.samples) {
    expect(sample.bottom).toBeCloseTo(bottom, 0);
    expect(sample.scrollY).toBe(maxScroll - 50);
    expect(sample.articleTop).toBe(atEnd.articleTop);
  }
});

test('desktop directory tracking does not change the narrow drawer layout', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This case checks the narrow viewport.');
  await page.goto('/post/getting-started', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.page-home-sider')).toBeHidden();
  await expect(page.locator('.two-column-content')).toHaveCSS('min-height', 'auto');
  const drawer = page.locator('.drawer-sider');
  const initial = await drawer.evaluate((element) => ({
    top: getComputedStyle(element).top,
    transition: getComputedStyle(element).transitionProperty,
  }));
  await page.evaluate(() => document.getElementById('site-header')?.classList.add('-translate-y-full'));
  expect(
    await drawer.evaluate((element) => ({
      top: getComputedStyle(element).top,
      transition: getComputedStyle(element).transitionProperty,
    })),
  ).toEqual(initial);
});

test('short pages do not clamp scrolling when the directory gives space back to the header', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The desktop sidebar controls the minimum height of this short page.');
  await page.goto('/tags', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const navigator = document.querySelector('astro-island[component-url*="Navigator"]');
    return navigator && !navigator.hasAttribute('ssr');
  });
  await page.evaluate(() => document.fonts.ready);
  const initialHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.evaluate(() => window.scrollTo({ top: 100, behavior: 'instant' }));
  await page.waitForTimeout(150);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect(page.locator('#site-header')).toHaveClass(/-translate-y-full/);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(150);
  const result = await page.evaluate(async () => {
    const requested = window.scrollY - 10;
    const samples: { scrollY: number; height: number }[] = [];
    const started = performance.now();
    window.scrollTo({ top: requested, behavior: 'instant' });
    return new Promise<{ requested: number; samples: typeof samples }>((resolve) => {
      const sample = () => {
        samples.push({ scrollY: window.scrollY, height: document.documentElement.scrollHeight });
        if (performance.now() - started >= 700) resolve({ requested, samples });
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
  });
  await expect(page.locator('#site-header')).not.toHaveClass(/-translate-y-full/);
  for (const sample of result.samples) {
    expect(sample.scrollY, 'Revealing the header must not clamp scroll position on a short page').toBe(result.requested);
    expect(sample.height, 'Sidebar motion must not change the short page height').toBe(initialHeight);
  }
});

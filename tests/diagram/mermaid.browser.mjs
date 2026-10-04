import assert from 'node:assert/strict';
import { chromium, expect, firefox, webkit } from '@playwright/test';

// Run against pnpm dev or pnpm preview; phone-size viewports do not substitute for a real phone.
const origin = process.env.DIAGRAM_TEST_ORIGIN || 'http://127.0.0.1:4321';
const engines = { chromium, firefox, webkit };
const browsers = (process.env.DIAGRAM_TEST_BROWSERS || 'firefox,chromium').split(',');

async function isolateExternalResources(page) {
  // The fixture includes third-party embeds; keep their availability outside this diagram regression.
  await page.route('**/*', (route) => {
    if (new URL(route.request().url()).origin === new URL(origin).origin) return route.continue();
    return route.abort();
  });
}

async function checkFullscreen(page, wrapper, pre, source) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const open = wrapper.getByRole('button', { name: '全屏查看', exact: true }).last();
  await open.click();
  const panel = page.getByRole('dialog').filter({ has: page.locator('.mermaid-svg-container') });
  await expect(panel).toBeVisible();
  const canvas = panel.locator('.mermaid-svg-container');
  const fit = panel.getByRole('button', { name: '适应屏幕 (0)', exact: true });
  const zoomIn = panel.getByRole('button', { name: '放大 (=)', exact: true });

  // At fit scale, trackpad panning still changes position and must not disable recentering.
  await canvas.evaluate((element) =>
    element.parentElement.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -40.5 })),
  );
  await expect.poll(() => canvas.evaluate((element) => new DOMMatrix(element.style.transform).f)).toBeGreaterThan(0);
  await expect(fit).toBeEnabled();
  await fit.click();
  await expect(canvas).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');

  // Both sources of reduced motion must bypass JavaScript interpolation, not just CSS transitions.
  for (const systemReduced of [false, true]) {
    await page.emulateMedia({ reducedMotion: systemReduced ? 'reduce' : 'no-preference' });
    const scale = await zoomIn.evaluate((button, systemReduced) => {
      document.documentElement.dataset.motion = systemReduced ? 'lively' : 'reduced';
      document.documentElement.classList.toggle('motion-off', !systemReduced);
      button.click();
      return new DOMMatrix(document.querySelector('.mermaid-svg-container').style.transform).a;
    }, systemReduced);
    assert.equal(scale, 1.5, 'Reduced motion zoom must finish synchronously');
    await fit.click();
  }

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => {
    document.documentElement.dataset.motion = 'lively';
    document.documentElement.classList.remove('motion-off');
  });
  const interruption = await zoomIn.evaluate(async (button) => {
    const canvas = document.querySelector('.mermaid-svg-container');
    document.documentElement.dataset.motion = 'lively';
    button.click();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const before = new DOMMatrix(canvas.style.transform).a;
    document.documentElement.dataset.motion = 'reduced';
    await new Promise(requestAnimationFrame);
    const after = new DOMMatrix(canvas.style.transform).a;
    await new Promise(requestAnimationFrame);
    return { before, after, later: new DOMMatrix(canvas.style.transform).a };
  });
  assert.ok(
    interruption.before > 1 && interruption.before < 1.5,
    `The test must interrupt an active zoom: ${JSON.stringify(interruption)}`,
  );
  assert.equal(interruption.after, 1.5);
  assert.equal(interruption.later, 1.5, 'No stale animation frame may undo the completed zoom');
  await fit.click();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);

  // A valid tall Mermaid is fitted by height while its CSS width remains natural.
  const steps = Array.from({ length: 20 }, (_, index) => `N${index}[Step ${index}] --> N${index + 1}[Step ${index + 1}]`);
  const tallSource = `flowchart TD\n${steps.join('\n')}`;
  await pre.evaluate((element, definition) => {
    element.dataset.diagram = definition;
    element.removeAttribute('data-processed');
  }, tallSource);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.classList.add('dark');
  });
  await expect.poll(() => pre.locator('svg').evaluate((svg) => svg.viewBox.baseVal.height)).toBeGreaterThan(2000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open.click();
  await expect(panel).toBeVisible();
  const drawingScale = await canvas.locator('svg').evaluate((svg) => svg.getScreenCTM().a);
  assert.ok(drawingScale < 0.5 && 1 / drawingScale < 6, 'The fixture must shrink by height within the zoom limit');
  await expect(panel.getByRole('button', { name: '实际大小 (1)', exact: true })).toBeVisible();
  await page.keyboard.press('1');
  await expect.poll(() => canvas.locator('svg').evaluate((svg) => svg.getScreenCTM().a)).toBeCloseTo(1, 2);
  await fit.click();
  await panel.getByRole('button', { name: '实际大小 (1)', exact: true }).click();
  await expect.poll(() => canvas.locator('svg').evaluate((svg) => svg.getScreenCTM().a)).toBeCloseTo(1, 2);
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await pre.evaluate((element, definition) => {
    element.dataset.diagram = definition;
    element.removeAttribute('data-processed');
  }, source);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.classList.remove('dark');
  });
  await expect.poll(() => pre.locator('svg').evaluate((svg) => svg.viewBox.baseVal.height)).toBeLessThan(2000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
}

for (const name of browsers) {
  assert.ok(engines[name], `Unknown browser: ${name}`);
  const browser = await engines[name].launch();
  try {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport, colorScheme: 'dark' });
      try {
        await isolateExternalResources(page);
        await page.goto(`${origin}/post/markdown-features`, { waitUntil: 'domcontentloaded' });
        const wrapper = page.locator('.mermaid-wrapper').first();
        const pre = wrapper.locator('pre.mermaid');
        const toggle = wrapper.getByRole('button', { name: /查看源码|查看渲染结果/ });
        await toggle.waitFor();
        await page.waitForFunction(() => document.querySelector('pre.mermaid[data-diagram-sized] > svg'));
        const source = await pre.getAttribute('data-diagram');
        assert.match(source, /^flowchart/);
        assert.ok(await pre.isVisible());
        const initialId = await pre.locator('svg').getAttribute('id');

        // A theme repaint must not replace the source view or restore a stale SVG snapshot.
        await toggle.click();
        assert.equal(await wrapper.locator('.mermaid-source code').textContent(), source);
        assert.ok(await pre.isHidden());
        await page.evaluate(() => {
          document.documentElement.dataset.theme = 'light';
          document.documentElement.classList.remove('dark');
        });
        await page.waitForFunction((id) => {
          const pre = document.querySelector('pre.mermaid');
          return pre.dataset.processed === 'true' && pre.querySelector('svg')?.id !== id;
        }, initialId);
        assert.equal(await wrapper.locator('.mermaid-source code').textContent(), source);
        const refreshedId = await pre.locator('svg').getAttribute('id');
        await toggle.click();
        assert.ok(await pre.isVisible());
        assert.equal(await pre.locator('svg').getAttribute('id'), refreshedId);

        // Drive astro-mermaid's actual error path rather than synthesizing an error message.
        await pre.evaluate((element) => {
          element.dataset.diagram = 'invalid diagram syntax';
          element.removeAttribute('data-processed');
        });
        await page.evaluate(() => {
          document.documentElement.dataset.theme = 'dark';
          document.documentElement.classList.add('dark');
        });
        await wrapper.getByRole('status').waitFor();
        assert.match(await wrapper.getByRole('status').textContent(), /图表暂时无法显示/);
        assert.ok(await pre.isHidden());
        assert.ok(await wrapper.getByRole('button', { name: '全屏查看', exact: true }).isDisabled());
        assert.ok(await wrapper.getByRole('button', { name: '刷新重试' }).isVisible());
        await toggle.click();
        assert.equal(await wrapper.locator('.mermaid-source code').textContent(), 'invalid diagram syntax');
        await toggle.click();

        // A later successful render must recover from the error state.
        await pre.evaluate((element, definition) => {
          element.dataset.diagram = definition;
          element.removeAttribute('data-processed');
        }, source);
        await page.evaluate(() => {
          document.documentElement.dataset.theme = 'light';
        });
        await page.waitForFunction(() => document.querySelector('pre.mermaid[data-processed="true"] > svg'));
        await wrapper.getByRole('status').waitFor({ state: 'detached' });
        assert.ok(await pre.isVisible());

        await checkFullscreen(page, wrapper, pre, source);

        // Rehydrate a rendered block whose canonical source is missing. Its SVG CSS must stay out of source view.
        await page.evaluate(() => {
          const pre = document.querySelector('pre.mermaid').cloneNode(true);
          pre.removeAttribute('data-diagram');
          pre.removeAttribute('data-react-enhanced');
          pre.id = 'missing-mermaid-source';
          document.querySelector('.custom-content').appendChild(pre);
          document.dispatchEvent(new CustomEvent('content:decrypted'));
        });
        const missingSource = page.locator('.mermaid-wrapper').filter({ has: page.locator('#missing-mermaid-source') });
        const sourceButton = missingSource.getByRole('button', { name: '查看源码' });
        await sourceButton.waitFor();
        assert.ok(await sourceButton.isDisabled(), 'SVG style text must never become Mermaid source');
        assert.equal(await missingSource.locator('.mermaid-source').count(), 0);
        console.log(
          `PASS ${name} ${viewport.width}px: render, theme/source, failure, recovery, missing source, fullscreen regressions`,
        );
      } finally {
        await page.close();
      }
    }
    if (name === 'firefox') {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      try {
        await isolateExternalResources(page);
        let blockedImports = 0;
        await page.route(/\/mermaid(?:\.core)?[^/]*\.js(?:\?|$)/, async (route) => {
          blockedImports++;
          await route.abort();
        });
        await page.goto(`${origin}/post/markdown-features`, { waitUntil: 'domcontentloaded' });
        const wrapper = page.locator('.mermaid-wrapper').first();
        await wrapper.getByRole('status').waitFor({ timeout: 25000 });
        assert.ok(blockedImports > 0, 'The test must block the actual Mermaid import');
        assert.match(await wrapper.getByRole('status').textContent(), /图表加载时间较长/);
        assert.equal(await wrapper.locator('pre.mermaid').getAttribute('data-processed'), null);
        await page.unrouteAll();
        await isolateExternalResources(page);
        await wrapper.getByRole('button', { name: '刷新重试' }).click();
        await page.waitForFunction(() => document.querySelector('pre.mermaid[data-diagram-sized] > svg'));
        console.log('PASS firefox: blocked Mermaid import shows delay notice; reload recovers');
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

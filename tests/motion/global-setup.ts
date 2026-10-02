import { chromium, type FullConfig } from '@playwright/test';

export default async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ reducedMotion: 'no-preference' });
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      let optimizationReloadSeen = false;
      const onResponse = (response: { status(): number; statusText(): string }) => {
        if (response.status() === 504 && response.statusText().includes('Outdated Optimize Dep')) {
          optimizationReloadSeen = true;
        }
      };
      page.on('response', onResponse);
      try {
        await page.goto(config.projects[0].use.baseURL ?? 'http://127.0.0.1:4339');
        await page.evaluate(async () => {
          const paths = [
            '/tests/motion/fixtures/segmented.tsx',
            '/tests/motion/fixtures/snowfall.tsx',
            '/src/components/moments/MessageBody.astro?astro&type=script&index=0&lang.ts',
            '/src/components/moments/MessageCard.astro?astro&type=script&index=0&lang.ts',
          ];
          await Promise.all(paths.map((path) => import(/* @vite-ignore */ path)));
          const spoiler = document.createElement('spoiler-span');
          spoiler.textContent = 'Warm motion fixture';
          document.body.append(spoiler);
          const spoilerPath = '/src/lib/spoiler-enhancer.ts';
          const { enhanceSpoilers } = await import(/* @vite-ignore */ spoilerPath);
          enhanceSpoilers(document);
          await Promise.race([
            customElements.whenDefined('spoiler-span'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Spoiler fixture failed to register')), 5000)),
          ]);
          document.documentElement.dataset.motionFixturesReady = 'true';
        });
        await page.waitForTimeout(500);
        const ready = await page.locator('html').getAttribute('data-motion-fixtures-ready');
        if (ready !== 'true') throw new Error('Vite reloaded the fixture warmup page');
        return;
      } catch (error) {
        const reloadError = /Execution context was destroyed|Resulting promise was garbage collected|Vite reloaded/.test(
          String(error),
        );
        if (attempt === 2 || (!optimizationReloadSeen && !reloadError)) throw error;
      } finally {
        page.off('response', onResponse);
      }
    }
  } finally {
    await browser.close();
  }
}

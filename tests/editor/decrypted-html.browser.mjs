// Run against an existing dev server: EDITOR_TEST_URL=http://localhost:4321 node --import tsx tests/editor/decrypted-html.browser.mjs
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { encryptEditorContent } from '../../src/features/editor/crypto.ts';

const testOrigin = new URL(process.env.EDITOR_TEST_URL ?? 'http://localhost:4321');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(new URL('/editor', testOrigin).href, { waitUntil: 'domcontentloaded' });
  await page.locator('.cm-content').waitFor();
  const previewElement = await page.locator('iframe[title="实际博文实时预览"]').elementHandle();
  const preview = await previewElement?.contentFrame();
  assert.ok(preview, 'preview iframe is loaded');
  await preview.locator('.custom-content').waitFor();
  await page.evaluate(() => {
    window.__previewXss = 0;
  });

  const send = async (source, mode = 'body') => {
    await page.evaluate(
      ({ markdown, previewMode }) => {
        document.querySelector('iframe[title="实际博文实时预览"]').contentWindow.postMessage(
          {
            type: 'koharu-preview-source',
            source: markdown,
            mode: previewMode,
            dark: false,
          },
          location.origin,
        );
      },
      { markdown: source, previewMode: mode },
    );
  };

  await send(
    '## Preview regression\n\n!!Hidden answer!!\n\nRead [internal page](/about) or [this heading](#preview-regression).',
  );
  const spoiler = preview.locator('spoiler-span');
  await expect(spoiler).toHaveAttribute('aria-pressed', 'false');
  await spoiler.click();
  await expect(spoiler).toHaveAttribute('aria-pressed', 'true');
  await spoiler.click();
  await expect(spoiler).toHaveAttribute('aria-pressed', 'false');
  const previewUrl = preview.url();
  const popupPromise = page.waitForEvent('popup');
  await preview.getByRole('link', { name: 'internal page', exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForURL(new URL('/about', testOrigin).href);
  await popup.close();
  assert.equal(preview.url(), previewUrl);
  await preview.getByRole('link', { name: 'this heading', exact: true }).click();
  assert.equal(preview.url(), previewUrl);
  await send('## Preview still updates');
  await expect(preview.locator('.custom-content h2')).toHaveText('Preview still updates');
  console.log('PASS: spoiler toggle, internal links open separately, heading anchors and subsequent preview updates');

  const article = Array.from({ length: 30 }, (_, index) => `## Section ${index + 1}\n\nBody ${index + 1}`).join('\n\n');
  await send(article, 'article');
  const disclosure = preview.locator('.editor-article-toc-disclosure');
  await expect(disclosure).toBeVisible();
  await expect(disclosure).not.toHaveAttribute('open', '');
  await expect(preview.locator('.editor-article-content')).toBeInViewport();
  await disclosure.locator('summary').click();
  await expect(disclosure).toHaveAttribute('open', '');
  await expect(disclosure.getByRole('link').first()).toBeVisible();
  await page.setViewportSize({ width: 2400, height: 1000 });
  await expect(disclosure).toHaveCount(0);
  await expect(preview.locator('.editor-article-toc nav')).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(disclosure).not.toHaveAttribute('open', '');
  console.log('PASS: narrow article directory starts collapsed, expands, and switches to the desktop sidebar');

  for (const className of ['encrypted-block', 'encrypted-post']) {
    const marker = `Safe ${className} decrypted`;
    const payload = `<p>${marker}</p><spoiler-span>Hidden decrypted answer</spoiler-span><a href="/about">Decrypted internal page</a><untrusted-widget>Safe text only</untrusted-widget><img src="/missing-xss-test-image.png" onerror="window.parent.__previewXss += 1"><svg onload="window.parent.__previewXss += 10"></svg><a href="javascript:window.parent.__previewXss += 100">bad URL</a><script>window.parent.__previewXss += 1000</script>`;
    const data = await encryptEditorContent(payload, 'regression-password');
    await send(`<div class="${className}" data-cipher="${data.cipher}" data-iv="${data.iv}" data-salt="${data.salt}"></div>`);
    await preview.locator(`.${className} input[type="password"]`).waitFor();
    await preview.locator(`.${className} input[type="password"]`).fill('regression-password');
    await preview.locator(`.${className} input[type="password"]`).press('Enter');
    await preview.getByText(marker).waitFor();
    await preview.locator('img[src="/missing-xss-test-image.png"]').evaluate(async (image) => {
      if (!image.complete)
        await new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
    });
    assert.equal(
      await preview
        .locator(
          '.custom-content [onerror], .custom-content [onload], .custom-content script, .custom-content [href^="javascript:"]',
        )
        .count(),
      0,
    );
    assert.equal(await page.evaluate(() => window.__previewXss), 0);
    await expect(preview.locator('spoiler-span')).toHaveAttribute('aria-pressed', 'false');
    await preview.locator('spoiler-span').click();
    await expect(preview.locator('spoiler-span')).toHaveAttribute('aria-pressed', 'true');
    await expect(preview.getByRole('link', { name: 'Decrypted internal page' })).toHaveAttribute('target', '_blank');
    assert.equal(await preview.locator('untrusted-widget').count(), 0);
    console.log(
      `PASS: prebuilt ${className} ciphertext decrypts harmless text and strips event handlers, scripts and active URLs`,
    );
  }

  for (const className of ['encrypted-block', 'encrypted-post']) {
    const data = await encryptEditorContent('<script>window.parent.__previewXss += 1000</script>', 'regression-password');
    await send(`<div class="${className}" data-cipher="${data.cipher}" data-iv="${data.iv}" data-salt="${data.salt}"></div>`);
    await preview.locator(`.${className} input[type="password"]`).waitFor();
    await preview.locator(`.${className} input[type="password"]`).fill('regression-password');
    await preview.locator(`.${className} input[type="password"]`).press('Enter');
    await preview.locator('.custom-content input[type="password"]').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => window.__previewXss), 0);
    if (className === 'encrypted-post') assert.equal(await preview.locator('.custom-content [data-cipher]').count(), 0);
    console.log(`PASS: sanitized-empty ${className} unlocks safely`);
  }
  assert.deepEqual(pageErrors, []);
} finally {
  await browser.close();
}

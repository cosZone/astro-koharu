// Uses an existing editor server; exercises real toolbar clicks/taps and selected source.
// EDITOR_TEST_URL=http://localhost:4321 EDITOR_TEST_BROWSER=webkit node tests/editor/formatting.browser.mjs
import assert from 'node:assert/strict';
import { chromium, expect, webkit } from '@playwright/test';

const origin = new URL(process.env.EDITOR_TEST_URL ?? 'http://localhost:4321');
const browserName = process.env.EDITOR_TEST_BROWSER ?? 'chromium';
assert.ok(['chromium', 'webkit'].includes(browserName));
const browser = await { chromium, webkit }[browserName].launch();
const source = '\uFEFF---\r\ntitle: 选区格式回归 # 保留注释\r\ncustom: null\r\n---\r\n\r\n选中文字';
const errors = [];

async function exported(page) {
  // Capture the application's canonical copy argument without repeated browser download prompts.
  await page.evaluate(() => {
    window.formattingCopiedSource = null;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.formattingCopiedSource = text;
        },
      },
    });
  });
  await page.getByRole('button', { name: '复制', exact: true }).click();
  await expect(page.locator('.editor-status')).toContainText('已复制完整 Markdown');
  return page.evaluate(() => window.formattingCopiedSource);
}

try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1140, height: 815 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(new URL('/editor', origin).href, { waitUntil: 'domcontentloaded' });
    const input = page.locator('.cm-content');
    await input.waitFor();
    const load = async () => {
      await page
        .locator('input[type=file]')
        .setInputFiles({ name: 'selection.md', mimeType: 'text/markdown', buffer: Buffer.from(source) });
      await expect(page.locator('.editor-document-name')).toContainText('选区格式回归');
      await expect(input).toContainText('选中文字');
      await input.click();
      await input.press('ControlOrMeta+End');
      await input.press('Shift+Home');
      assert.equal(await page.evaluate(() => window.getSelection().toString()), '选中文字');
    };
    const activate = async (label) => {
      const button = page.getByTitle(label, { exact: true });
      if (mobile) await button.tap();
      else await button.click();
    };

    for (const [label, marked] of [
      ['粗体', '**选中文字**'],
      ['斜体', '*选中文字*'],
      ['行内代码与代码块', '`选中文字`'],
      ['数学公式', '$选中文字$'],
      ['标题', '## 选中文字'],
      ['提醒块', ':::info\r\n选中文字\r\n:::'],
    ]) {
      await load();
      await activate(label);
      await expect(input).toBeFocused();
      assert.equal(
        await exported(page),
        source.replace('选中文字', marked),
        `${browserName}/${mobile}/${label}: retain original text and file format`,
      );
      await activate(label);
      assert.equal(await exported(page), source, `${browserName}/${mobile}/${label}: second activation removes this format`);
    }
    for (const [label, marked, url] of [
      ['文字链接', '[选中文字](https://example.com)', 'https://example.com'],
      ['图片', '![选中文字](https://example.com/image.webp)', 'https://example.com/image.webp'],
    ]) {
      await load();
      await activate(label);
      await expect(input).toBeFocused();
      await expect.poll(() => page.evaluate(() => window.getSelection().toString())).toBe(url);
      assert.equal(await exported(page), source.replace('选中文字', marked));
    }
    await load();
    await activate('粗体');
    const preview = page.locator('iframe[title="实际博文实时预览"]').contentFrame();
    await expect(preview.locator('.custom-content strong')).toContainText('选中文字');
    await page.getByRole('button', { name: '撤销', exact: true }).click();
    assert.equal(await exported(page), source);
    await page.getByRole('button', { name: '重做', exact: true }).click();
    assert.equal(await exported(page), source.replace('选中文字', '**选中文字**'));

    await load();
    await input.press('ArrowRight');
    await activate('粗体');
    await expect.poll(() => page.evaluate(() => window.getSelection().toString())).toBe('重点文字');
    await input.pressSequentially('继续写');
    assert.equal(await exported(page), `${source}**继续写**`);
    await page.screenshot({ path: `/private/tmp/editor-formatting-${browserName}-${mobile ? 'mobile' : 'desktop'}.png` });
    await context.close();
    console.log(
      `PASS ${browserName}/${mobile ? 'mobile tap' : 'desktop click'}: all toolbar formats preserve source, toggle, focus, editable URL, placeholder, live preview and undo/redo`,
    );
  }
  assert.deepEqual(errors, [], 'no uncaught browser errors');
} finally {
  await browser.close();
}

// Uses an existing server; emulates mobile browsers, not a physical keyboard or selection handles.
// EDITOR_TEST_URL=http://localhost:4321 EDITOR_TEST_BROWSER=webkit node tests/editor/mobile.browser.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, devices, expect, webkit } from '@playwright/test';

const origin = new URL(process.env.EDITOR_TEST_URL ?? 'http://localhost:4321');
const browserName = process.env.EDITOR_TEST_BROWSER ?? 'chromium';
assert.ok(['chromium', 'webkit'].includes(browserName), 'EDITOR_TEST_BROWSER must be chromium or webkit');
const browser = await { chromium, webkit }[browserName].launch();
const errors = [];
const source = '\uFEFF---\r\ntitle: "手机回归"\r\ndate: 2026-10-03\r\n---\r\n\r\n## 手机正文\r\n\r\n原始内容\r\n';

async function importSource(scope) {
  await scope.locator('.cm-content').waitFor();
  await scope.locator('input[type=file]').setInputFiles({
    name: 'mobile-regression.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(source),
  });
  await expect(scope.locator('.editor-document-name')).toContainText('手机回归');
  await expect(scope.locator('.editor-document-meta')).toContainText('草稿已保存在此浏览器');
}

async function setClipboardMode(scope, mode) {
  await scope.evaluate((value) => {
    if (!window.editorClipboardTest) {
      window.editorClipboardTest = { nativeCopy: document.execCommand.bind(document), calls: 0, copied: null };
      // The application's document copy listener has populated the canonical source before bubbling here.
      window.addEventListener('copy', (event) => {
        window.editorClipboardTest.copied = event.clipboardData?.getData('text/plain');
      });
    }
    const state = window.editorClipboardTest;
    state.calls = 0;
    state.copied = null;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value:
        value === 'missing'
          ? undefined
          : { writeText: () => Promise.reject(new DOMException('Test permission denial', 'NotAllowedError')) },
    });
    document.execCommand = (...args) => {
      state.calls++;
      return value === 'blocked' ? false : state.nativeCopy(...args);
    };
  }, mode);
}

async function checkClipboard(scope, page, label) {
  await importSource(scope);
  for (const mode of ['missing', 'rejected']) {
    await setClipboardMode(scope, mode);
    await scope.getByRole('button', { name: '复制', exact: true }).click();
    await expect(scope.locator('.editor-document-meta')).toContainText('已复制完整 Markdown');
    const state = await scope.evaluate(() => ({
      calls: window.editorClipboardTest.calls,
      copied: window.editorClipboardTest.copied,
    }));
    assert.equal(state.calls, 1, `${label}/${mode}: native fallback invoked`);
    assert.equal(state.copied, source, `${label}/${mode}: fallback copy event preserves BOM and CRLF`);
    await expect(scope.getByRole('dialog')).toHaveCount(0);
  }

  await setClipboardMode(scope, 'blocked');
  await scope.getByRole('button', { name: '复制', exact: true }).click();
  const dialog = scope.getByRole('dialog', { name: '复制 Markdown', exact: true });
  const input = dialog.getByRole('textbox', { name: '完整 Markdown 原文', exact: true });
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  // Native textarea values normalize line endings; the canonical export must still preserve them.
  await expect(input).toHaveValue(source.replace(/\r\n/g, '\n'));
  assert.equal(await input.evaluate((element) => getComputedStyle(element).fontSize), '16px');
  await page.screenshot({ path: `/private/tmp/editor-mobile-${browserName}-${label}-copy.png` });
  for (const action of ['全选原文', '再次复制']) {
    await dialog.getByRole('button', { name: action, exact: true }).click();
    assert.equal(
      await input.evaluate((element) => element.selectionEnd - element.selectionStart),
      source.replace(/\r\n/g, '\n').length,
    );
  }
  const downloadEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: '下载 MD', exact: true }).click();
  const download = await downloadEvent;
  assert.equal(await readFile(await download.path(), 'utf8'), source, `${label}: manual fallback download remains exact`);
  await input.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(scope.getByRole('button', { name: '复制', exact: true })).toBeFocused();
  console.log(`PASS ${label}: missing/denied Clipboard API fallback, exact source, manual copy and download`);
}

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    ...(browserName === 'webkit' ? { userAgent: devices['iPhone 13'].userAgent } : {}),
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(new URL('/editor', origin).href, { waitUntil: 'domcontentloaded' });
  await importSource(page);
  const input = page.locator('.cm-content');
  const position = page.locator('.editor-source-pane .editor-pane-heading small');
  let lightThemeClass;
  for (const dark of [false, true]) {
    await page.evaluate((value) => document.documentElement.classList.toggle('dark', value), dark);
    await input.click();
    await input.press('ControlOrMeta+a');
    await input.press('ArrowRight');
    // CodeMirror generates its theme class names; they are not literal cm-light/cm-dark classes.
    if (dark) await expect(page.locator('.cm-editor')).not.toHaveAttribute('class', lightThemeClass);
    else lightThemeClass = await page.locator('.cm-editor').getAttribute('class');
    await expect(page.locator('.cm-cursor-primary')).toBeVisible();
    const cursor = await page.locator('.cm-cursor-primary').evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: style.borderLeftWidth, color: style.borderLeftColor };
    });
    assert.equal(cursor.width, '2px');
    assert.notEqual(
      cursor.color,
      await input.evaluate((element) => getComputedStyle(element.closest('.cm-editor')).backgroundColor),
    );
    await expect(page.locator('.cm-activeLine')).toHaveCount(1);
    await expect(page.locator('.cm-lineNumbers .cm-activeLineGutter')).toHaveCount(1);
    assert.notEqual(
      await page.locator('.cm-activeLine').evaluate((element) => getComputedStyle(element).backgroundColor),
      'rgba(0, 0, 0, 0)',
    );
    const before = await position.textContent();
    await input.press('ArrowLeft');
    await expect(position).not.toHaveText(before);
    await page.screenshot({
      path: `/private/tmp/editor-mobile-${browserName}-${dark ? 'dark' : 'light'}-caret.png`,
      animations: 'disabled',
    });
    await input.press('Shift+ArrowLeft');
    await input.press('Shift+ArrowLeft');
    await expect(page.locator('.cm-selectionBackground')).toBeVisible();
    assert.equal(await page.evaluate(() => window.getSelection().toString()), '内容');
    if (browserName === 'webkit') await expect(page.locator('.cm-selectionHandle')).toHaveCount(2);
    await page.screenshot({
      path: `/private/tmp/editor-mobile-${browserName}-${dark ? 'dark' : 'light'}-selection.png`,
      animations: 'disabled',
    });
    await input.press('ArrowRight');
  }

  await input.press('ControlOrMeta+a');
  await input.press('ArrowRight');
  await input.pressSequentially('mobile-undo-marker');
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(input).not.toContainText('mobile-undo-marker');
  await page.getByRole('button', { name: '重做', exact: true }).click();
  await expect(input).toContainText('mobile-undo-marker');
  const syntaxTrigger = page.getByRole('button', { name: '语法', exact: true });
  await syntaxTrigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: '语法手册', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(syntaxTrigger).toBeFocused();

  await page.getByRole('button', { name: '预览', exact: true }).click();
  await syntaxTrigger.click();
  await page.getByRole('searchbox').fill('标签卡');
  await page.locator('.editor-syntax-toggle').click();
  await page.getByRole('button', { name: '插入模板', exact: true }).click();
  await expect(input).toContainText(';;;example 第一页');
  await expect(input).toBeFocused();
  await expect(page.locator('.editor-source-pane')).toBeVisible();

  for (const width of [320, 360, 390, 430, 740, 801, 844]) {
    await page.setViewportSize({ width, height: width <= 430 ? 740 : 390 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    if (width > 800) {
      const focus = page.getByRole('button', { name: '专注', exact: true });
      await focus.click();
      await expect(page.locator('.editor-workspace')).toHaveClass(/editor-focus/);
      await page.getByRole('button', { name: '退出专注', exact: true }).click();
      await page.getByRole('button', { name: '文章属性', exact: true }).click();
      await expect(page.getByRole('dialog', { name: '文章属性', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
    }
  }

  await page.setViewportSize({ width: 320, height: 568 });
  await syntaxTrigger.click();
  // The sheet slides up on open; measure its resting position.
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
  // Simulate the browser's resize/scroll events without claiming to exercise a real software keyboard.
  await page.evaluate(() => {
    Object.defineProperty(visualViewport, 'height', { configurable: true, value: 280 });
    Object.defineProperty(visualViewport, 'offsetTop', { configurable: true, value: 70 });
    visualViewport.dispatchEvent(new Event('resize'));
  });
  for (const selector of ['.editor-workspace', '.editor-panel-backdrop', '.editor-panel']) {
    const bounds = await page.locator(selector).boundingBox();
    assert.equal(bounds.y, 70, `${selector} follows the visual viewport offset`);
    assert.equal(bounds.height, 280, `${selector} follows the visual viewport height`);
  }
  await page.evaluate(() => {
    Object.defineProperty(visualViewport, 'offsetTop', { configurable: true, value: 90 });
    visualViewport.dispatchEvent(new Event('scroll'));
  });
  assert.equal((await page.locator('.editor-panel-backdrop').boundingBox()).y, 90);
  await page.evaluate(() => {
    delete visualViewport.height;
    delete visualViewport.offsetTop;
    visualViewport.dispatchEvent(new Event('resize'));
  });
  await page.keyboard.press('Escape');
  console.log(
    `PASS ${browserName}: light/dark cursor, active line, position, mobile history, dialog focus, insertion, landscape and viewport simulation`,
  );

  await checkClipboard(page, page, 'standalone');
  const host = await context.newPage();
  host.on('pageerror', (error) => errors.push(error.message));
  await host.route('**/editor-test-host', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}iframe{border:0;width:100%;height:100dvh}</style><iframe title="Embedded editor" src="/editor"></iframe>',
    }),
  );
  await host.goto(new URL('/editor-test-host', origin).href, { waitUntil: 'domcontentloaded' });
  const embedded = await (await host.getByTitle('Embedded editor').elementHandle()).contentFrame();
  await checkClipboard(embedded, host, 'iframe');
  assert.deepEqual(errors, [], 'no uncaught browser errors');
} finally {
  await browser.close();
}

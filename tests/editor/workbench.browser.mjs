// Run with the blog dev server and optional CMS already running; this script never starts servers.
// EDITOR_TEST_URL=http://localhost:4321 CMS_TEST_URL=http://localhost:4322 node tests/editor/workbench.browser.mjs
import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const origin = new URL(process.env.EDITOR_TEST_URL ?? 'http://localhost:4321');
const browser = await chromium.launch();
const errors = [];
const source =
  '\uFEFF---\r\ntitle: "浏览器验收文章" # 原有注释\r\ndate: 2026-10-03 12:00:00\r\ncustom: null\r\ntags: [验收]\r\n---\r\n\r\n## 验收标题\r\n\r\n++中文强调++\r\n\r\n:::info\r\n保留完整原文\r\n:::\r\n';
const fixtureId = `_editor-browser-${process.pid}.md`;
const fixturePath = fileURLToPath(new URL(`../../src/content/blog/${fixtureId}`, import.meta.url));

async function append(scope, text) {
  const input = scope.locator('.cm-content');
  await input.click();
  await input.press('ControlOrMeta+a');
  await input.press('ArrowRight');
  await input.press('Enter');
  await input.pressSequentially(text);
}

async function cachedSource(scope) {
  return scope.evaluate(() => {
    const id = localStorage.getItem('koharu-editor:active:v1');
    return JSON.parse(localStorage.getItem(`koharu-editor:draft:${id}`)).source;
  });
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 940 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: origin.origin });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(new URL('/editor', origin).href, { waitUntil: 'domcontentloaded' });
  await page.locator('.cm-content').waitFor();
  const statusBounds = await page.locator('.editor-status').boundingBox();
  for (const selector of ['.editor-source-pane', '.editor-preview-pane']) {
    const bounds = await page.locator(selector).boundingBox();
    assert.ok(bounds.y + bounds.height <= statusBounds.y + 1, `${selector}: the last editable line must clear the status bar`);
  }
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: '完整原文.md', mimeType: 'text/markdown', buffer: Buffer.from(source) });
  const preview = page.locator('iframe[title="实际博文实时预览"]').contentFrame();
  await expect(preview.locator('.custom-content h2')).toContainText('验收标题');
  await expect(preview.locator('.custom-content ins')).toContainText('中文强调');
  assert.equal(await page.getByRole('button', { name: '保存到博客' }).count(), 0);
  await page.getByRole('button', { name: '复制', exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), source);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 MD', exact: true }).click();
  const download = await downloadEvent;
  assert.equal(await readFile(await download.path(), 'utf8'), source);
  await page.waitForTimeout(700);
  await append(page, '中文输入新增');
  // Open the currently active draft synchronously within the autosave debounce window.
  await page.getByRole('button', { name: '草稿', exact: true }).evaluate((button) => {
    if (button instanceof HTMLElement) button.click();
  });
  await page
    .locator('.editor-draft-row button')
    .filter({ hasText: '浏览器验收文章' })
    .evaluate((button) => {
      if (button instanceof HTMLElement) button.click();
    });
  await expect(page.locator('.cm-content')).toContainText('中文输入新增');
  await page.waitForTimeout(700);
  const changed = await cachedSource(page);
  assert.ok(changed.includes('\r\n中文输入新增'));
  assert.ok(changed.startsWith('\uFEFF---\r\n'));
  await page.getByRole('button', { name: '新建', exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: '草稿', exact: true }).click();
  await page.locator('.editor-draft-row button').filter({ hasText: '浏览器验收文章' }).click();
  await expect(page.locator('.cm-content')).toContainText('中文输入新增');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.cm-content')).toContainText('中文输入新增');
  await page.getByRole('button', { name: '完整文章', exact: true }).click();
  await expect(preview.locator('.editor-article-cover h1')).toContainText('浏览器验收文章');
  await page.screenshot({ path: '/private/tmp/editor-verified-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('.editor-preview-pane')).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.getByRole('button', { name: '语法', exact: true }).click();
  await page.getByRole('searchbox').fill('标签卡');
  await page.locator('.editor-syntax-toggle').click();
  await page.getByRole('button', { name: '插入模板', exact: true }).click();
  await expect(page.locator('.cm-content')).toContainText(';;;example 第一页');
  await expect(page.locator('.editor-source-pane')).toBeVisible();
  await page.screenshot({ path: '/private/tmp/editor-verified-mobile.png' });
  await page.setViewportSize({ width: 320, height: 568 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
  assert.ok((await page.locator('.editor-source-pane').boundingBox()).height > 200);
  console.log(
    'PASS public: exact copy/download, CRLF/BOM editing, current-draft race, multiple drafts/reload, full article, mobile 390/320 and syntax insertion',
  );

  if (process.env.CMS_TEST_URL) {
    await writeFile(fixturePath, source);
    const cms = await context.newPage();
    cms.on('pageerror', (error) => errors.push(error.message));
    await cms.goto(process.env.CMS_TEST_URL, { waitUntil: 'domcontentloaded' });
    await cms.getByRole('button', { name: 'posts', exact: true }).click();
    const row = cms.locator('tr').filter({ hasText: '浏览器验收文章' });
    await row.getByTitle('Edit post', { exact: true }).click();
    const editor = cms.locator('iframe[title="Koharu 写作室"]').contentFrame();
    const reloadFrame = () =>
      cms.locator('iframe[title="Koharu 写作室"]').evaluate((frame) => {
        // Reload from the stable parent so concurrent content HMR cannot destroy the evaluate context.
        frame.setAttribute('src', frame.src);
      });
    const saveFile = async (expectedSource) => {
      const completed = cms.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/cms/source' &&
          response.request().method() === 'POST' &&
          response.request().postDataJSON()?.postId === fixtureId,
      );
      await editor.getByRole('button', { name: '保存到博客', exact: true }).click();
      const response = await completed;
      assert.equal(response.status(), 200);
      assert.equal(response.request().postDataJSON().source, expectedSource);
      const result = await response.json();
      assert.equal(result.success, true);
      assert.equal(result.postId, fixtureId);
      assert.equal(result.source, expectedSource);
      await expect.poll(() => readFile(fixturePath, 'utf8')).toBe(expectedSource);
      assert.deepEqual(await readFile(fixturePath), Buffer.from(expectedSource));
    };
    await expect(editor.getByRole('button', { name: '保存到博客', exact: true })).toBeVisible({ timeout: 20_000 });
    // A Vite or user reload changes the iframe referrer to itself; CMS access must reconnect.
    await editor.locator('.cm-content').evaluate(() => location.reload());
    await expect(editor.getByRole('button', { name: '保存到博客', exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(cms.getByRole('alert')).toHaveCount(0);
    // Content HMR may replace the transient success footer before an assertion observes it.
    await saveFile(source);
    const cmsInput = editor.locator('.cm-content');
    await editor.locator('.cm-line').filter({ hasText: '保留完整原文' }).click();
    await cmsInput.press('Home');
    await cmsInput.press('Shift+End');
    await expect.poll(() => cmsInput.evaluate(() => window.getSelection().toString())).toBe('保留完整原文');
    await editor.getByTitle('粗体', { exact: true }).click();
    await editor.getByRole('button', { name: '撤销', exact: true }).click();
    await expect(editor.locator('.cm-line').filter({ hasText: '保留完整原文' })).toHaveText('保留完整原文');
    await editor.getByRole('button', { name: '重做', exact: true }).click();
    await expect(editor.locator('.cm-line').filter({ hasText: '保留完整原文' })).toHaveText('**保留完整原文**');
    await saveFile(source.replace('保留完整原文', '**保留完整原文**'));
    // Astro content HMR can reload the iframe after a file write. Undo must survive that reload.
    await reloadFrame();
    await expect(editor.getByRole('button', { name: '保存到博客', exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(editor.locator('.cm-line').filter({ hasText: '保留完整原文' })).toHaveText('**保留完整原文**');
    await editor.getByRole('button', { name: '撤销', exact: true }).click();
    await expect(editor.locator('.cm-line').filter({ hasText: '保留完整原文' })).toHaveText('保留完整原文');
    await saveFile(source);
    await append(editor, 'CMS新增');
    // Reconnecting keeps the browser draft and its original disk baseline instead of overwriting unsaved changes.
    await reloadFrame();
    await expect(editor.getByRole('button', { name: '保存到博客', exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(editor.locator('.cm-content')).toContainText('CMS新增');
    await saveFile(`${source}\r\nCMS新增`);
    const saved = await readFile(fixturePath, 'utf8');
    assert.ok(saved.startsWith('\uFEFF---\r\n') && saved.includes('custom: null'));
    assert.ok(saved.includes('\r\nCMS新增'));
    const external = `${saved}\r\n外部工具更新\r\n`;
    await writeFile(fixturePath, external);
    await append(editor, '冲突未覆盖');
    await reloadFrame();
    await expect(editor.getByRole('button', { name: '保存到博客', exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(editor.locator('.cm-content')).toContainText('冲突未覆盖');
    await editor.getByRole('button', { name: '保存到博客', exact: true }).click();
    await expect(editor.getByRole('alert')).toContainText('其他');
    assert.equal(await readFile(fixturePath, 'utf8'), external);
    await cms.waitForTimeout(700);
    await editor.getByRole('button', { name: '草稿', exact: true }).click();
    cms.once('dialog', (dialog) => dialog.accept());
    await editor
      .locator('.editor-draft-row[data-current="true"]')
      .getByRole('button', { name: '删除草稿 浏览器验收文章', exact: true })
      .click();
    await expect(editor.getByRole('button', { name: '保存到博客', exact: true })).toHaveCount(0);
    assert.equal(await readFile(fixturePath, 'utf8'), external);
    await reloadFrame();
    await expect(editor.locator('.cm-content')).toBeVisible();
    await expect(editor.getByRole('button', { name: '保存到博客', exact: true })).toHaveCount(0);
    await cms.getByRole('button', { name: '← 返回文章列表', exact: true }).click();
    await cms.locator('tr').filter({ hasText: '浏览器验收文章' }).getByTitle('Edit post', { exact: true }).click();
    const reopened = cms.locator('iframe[title="Koharu 写作室"]').contentFrame();
    await expect(reopened.getByRole('button', { name: '保存到博客', exact: true })).toBeVisible();
    await expect(reopened.locator('.cm-content')).toContainText('外部工具更新');
    await expect(reopened.locator('.cm-content')).not.toContainText('冲突未覆盖');
    await cms.setViewportSize({ width: 390, height: 844 });
    await expect(reopened.getByRole('button', { name: '保存到博客', exact: true })).toBeVisible();
    assert.equal(await cms.evaluate(() => document.documentElement.scrollWidth), 390);
    assert.equal(await reopened.locator('.cm-content').evaluate(() => document.documentElement.scrollWidth), 390);
    await reopened.getByRole('button', { name: '语法', exact: true }).click();
    await expect(reopened.getByRole('dialog', { name: '语法手册', exact: true })).toBeVisible();
    await cms.screenshot({ path: '/private/tmp/editor-cms-mobile-handbook.png' });
    await reopened.getByRole('button', { name: '关闭语法手册', exact: true }).click();
    await cms.screenshot({ path: '/private/tmp/editor-cms-mobile-source.png' });
    await cms.setViewportSize({ width: 320, height: 568 });
    await expect(reopened.getByRole('button', { name: '保存到博客', exact: true })).toBeVisible();
    assert.equal(await cms.evaluate(() => document.documentElement.scrollWidth), 320);
    assert.equal(await reopened.locator('.cm-content').evaluate(() => document.documentElement.scrollWidth), 320);
    console.log(
      'PASS CMS: shared editor, exact no-op save, CRLF editing, external conflict, deletion clears file-save context',
    );
  }
  assert.deepEqual(errors, [], 'no uncaught browser errors');
} finally {
  await rm(fixturePath, { force: true });
  await browser.close();
}

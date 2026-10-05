// Run against an existing Astro server; all drafts belong to this isolated browser context.
// EDITOR_TEST_URL=http://localhost:4321 node tests/editor/properties.browser.mjs
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { parse } from 'yaml';

const origin = new URL(process.env.EDITOR_TEST_URL ?? 'http://localhost:4321');
const browser = await chromium.launch();
const errors = [];

async function cachedSource(page) {
  return page.evaluate(() => {
    const id = localStorage.getItem('koharu-editor:active:v1');
    return JSON.parse(localStorage.getItem(`koharu-editor:draft:${id}`) ?? 'null')?.source ?? '';
  });
}

function properties(source) {
  return parse(source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '') ?? {};
}

async function importSource(page, source) {
  await page.locator('input[type=file]').setInputFiles({
    name: 'properties-regression.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(source),
  });
  await expect.poll(() => cachedSource(page)).toBe(source);
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(new URL('/editor', origin).href, { waitUntil: 'domcontentloaded' });
  await page.locator('.cm-content').waitFor();

  const source = '---\ntitle: 属性回归\ntags: [alpha]\ncategories: [[Parent, Child]]\ncustom: null\n---\n\n保留正文\n';
  await importSource(page, source);
  await page.getByRole('button', { name: '文章属性', exact: true }).click();
  const categories = page.getByLabel('分类', { exact: true });
  await categories.focus();
  await page.getByRole('dialog').getByLabel('标题', { exact: true }).focus();
  assert.equal(await cachedSource(page), source, 'focusing and leaving a nested category must not rewrite it');

  const tags = page.getByLabel('标签', { exact: true });
  await tags.focus();
  await tags.press('End');
  await tags.pressSequentially('，beta,gamma');
  await expect(tags).toHaveValue('alpha，beta,gamma');
  assert.equal(await cachedSource(page), source, 'unfinished list input must retain the previous source');
  await tags.press('Enter');
  await expect(tags).toHaveValue('alpha, beta, gamma');
  await expect.poll(async () => properties(await cachedSource(page)).tags).toEqual(['alpha', 'beta', 'gamma']);
  assert.deepEqual(properties(await cachedSource(page)).categories, [['Parent', 'Child']]);

  await categories.fill('');
  await categories.pressSequentially('First，Second,Third');
  await expect(categories).toHaveValue('First，Second,Third');
  await page.getByRole('dialog').getByLabel('标题', { exact: true }).focus();
  await expect(categories).toHaveValue('First, Second, Third');
  await expect.poll(async () => properties(await cachedSource(page)).categories).toEqual(['First', 'Second', 'Third']);
  assert.equal(properties(await cachedSource(page)).custom, null);
  assert.ok((await cachedSource(page)).endsWith('\n\n保留正文\n'));

  await page.getByRole('button', { name: '关闭面板', exact: true }).click();
  const replacement = '---\ntitle: 外部源码\ntags: [external]\ncategories: [replacement]\n---\n\n外部正文\n';
  await importSource(page, replacement);
  await page.getByRole('button', { name: '文章属性', exact: true }).click();
  await expect(tags).toHaveValue('external');
  await expect(categories).toHaveValue('replacement');
  await page.getByRole('button', { name: '关闭面板', exact: true }).click();

  const malformed = '---\ntitle: [unfinished\n---\n\n错误 YAML 也必须保留正文\n';
  await importSource(page, malformed);
  await page.getByRole('button', { name: '文章属性', exact: true }).click();
  await page.getByRole('dialog').getByLabel('标题', { exact: true }).fill('不能覆盖原文');
  await expect(page.locator('.editor-workspace')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('YAML');
  assert.equal(await cachedSource(page), malformed);
  await page.getByRole('button', { name: '关闭面板', exact: true }).click();
  await expect(page.locator('.cm-content')).toContainText('错误 YAML 也必须保留正文');
  assert.deepEqual(errors, [], 'property validation must not throw uncaught browser errors');
  console.log(
    'PASS properties: comma typing, Enter/blur commits, nested categories, external source, malformed YAML preservation',
  );
} finally {
  await browser.close();
}

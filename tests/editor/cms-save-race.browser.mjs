// Uses the existing CMS/editor servers and isolated browser storage. Every CMS API is mocked;
// delayed save responses exercise the real SourcePostEditor and editor iframe without writing files.
// CMS_TEST_URL=http://localhost:4322 EDITOR_TEST_BROWSER=webkit node tests/editor/cms-save-race.browser.mjs
import assert from 'node:assert/strict';
import { chromium, expect, webkit } from '@playwright/test';

const browserName = process.env.EDITOR_TEST_BROWSER ?? 'chromium';
assert.ok(['chromium', 'webkit'].includes(browserName));
const browser = await { chromium, webkit }[browserName].launch();
const pending = new Map();

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.error(error.message);
  });
  await page.addInitScript(() => {
    window.cmsSaveMessages = [];
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'koharu-cms-save') window.cmsSaveMessages.push(event.data);
    });
  });
  const source = '---\ntitle: CMS save race\n---\nBODY';
  const post = {
    id: 'cms-save-race.md',
    slug: 'cms-save-race',
    title: 'CMS save race',
    date: '2026-10-01',
    categories: [],
    tags: [],
    draft: false,
    sticky: false,
  };
  const writes = [];
  await page.route('**/api/cms/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/cms/list') {
      await route.fulfill({
        json: {
          posts: [post],
          total: 1,
          categories: [],
          tags: [],
          stats: { total: 1, published: 1, draft: 0, categoryStats: [], tagStats: [], recentPosts: [post] },
        },
      });
    } else if (url.pathname === '/api/cms/config') {
      await route.fulfill({ json: { projectRoot: '/tmp', contentDir: 'src/content/blog', categoryMap: {} } });
    } else if (url.pathname === '/api/cms/source' && route.request().method() === 'GET') {
      await route.fulfill({ json: { postId: post.id, source } });
    } else if (url.pathname === '/api/cms/source' && route.request().method() === 'POST') {
      const index = writes.length;
      writes.push(route.request().postDataJSON());
      pending.set(index, route);
    } else {
      await route.abort();
    }
  });
  const finish = async (index, status = 200) => {
    const route = pending.get(index);
    assert.ok(route, `save ${index} is pending`);
    pending.delete(index);
    await route.fulfill({
      status,
      json:
        status === 200
          ? { success: true, postId: post.id, source: writes[index].source }
          : { error: 'Blog source changed; reload it before saving' },
    });
  };
  await page.goto(process.env.CMS_TEST_URL ?? 'http://localhost:4322');
  await page.getByRole('button', { name: 'posts', exact: true }).click();
  await page.getByTitle('Edit post', { exact: true }).click();
  const editor = page.locator('iframe[title="Koharu 写作室"]').contentFrame();
  const save = () => editor.getByRole('button', { name: '保存到博客', exact: true });
  const saving = () => editor.getByRole('button', { name: '保存中…', exact: true });
  const append = async (text) => {
    const input = editor.locator('.cm-content');
    await input.click();
    await input.press('ControlOrMeta+End');
    await input.pressSequentially(text);
  };
  const message = (index) => page.evaluate((i) => window.cmsSaveMessages[i], index);
  const acknowledge = async (request, error) => {
    await page.evaluate(
      ({ request, error }) => {
        const frame = document.querySelector('iframe[title="Koharu 写作室"]');
        frame.contentWindow.postMessage(
          { type: 'koharu-cms-result', postId: request.postId, requestId: request.requestId, error },
          new URL(frame.src).origin,
        );
      },
      { request, error },
    );
  };

  await expect(save()).toBeVisible({ timeout: 20_000 });
  await save().click();
  await expect.poll(() => writes.length).toBe(1);
  await editor.locator('.cm-content').evaluate(() => location.reload());
  await expect(save()).toBeVisible({ timeout: 20_000 });
  await append('B');
  await save().click();
  await expect(editor.getByRole('alert')).toContainText('仍在保存');
  await expect(save()).toBeEnabled();
  assert.equal(writes.length, 1, 'busy retry must not reach the file API');
  const first = await message(0);
  const busy = await message(1);
  assert.equal(typeof first.requestId, 'string');
  assert.notEqual(first.requestId, busy.requestId);
  await finish(0);
  await expect(editor.getByRole('alert')).toContainText('仍在保存');
  await expect(editor.locator('.editor-document-meta')).not.toContainText('已保存到博客文件');

  await save().click();
  await expect.poll(() => writes.length).toBe(2);
  assert.equal(writes[1].expectedSource, writes[0].source, 'old completion still advances the CMS disk baseline');
  assert.equal(writes[1].source, `${source}B`);
  await acknowledge(first);
  await acknowledge(busy, 'stale busy result');
  await expect(saving()).toBeDisabled();
  await expect(editor.getByRole('alert')).toHaveCount(0);
  await append('C');
  await finish(1);
  await expect(save()).toBeEnabled();
  await expect(editor.locator('.editor-document-meta')).toContainText('后续修改仍待保存');

  await save().click();
  await expect.poll(() => writes.length).toBe(3);
  assert.equal(writes[2].expectedSource, `${source}B`);
  assert.equal(writes[2].source, `${source}BC`);
  const failed = await message(3);
  await finish(2, 409);
  await expect(editor.getByRole('alert')).toContainText('其他工具修改');
  await expect(save()).toBeEnabled();
  await save().click();
  await expect.poll(() => writes.length).toBe(4);
  assert.equal(writes[3].expectedSource, `${source}B`, 'failed saves never advance the baseline');
  await acknowledge(failed, 'duplicate failed result');
  await expect(saving()).toBeDisabled();
  await expect(editor.getByRole('alert')).toHaveCount(0);
  await finish(3);
  await expect(save()).toBeEnabled();
  await expect(editor.locator('.editor-document-meta')).toContainText('已保存到博客文件');

  await append('D');
  await save().click();
  await expect.poll(() => writes.length).toBe(5);
  await editor.getByRole('button', { name: '新建', exact: true }).click();
  await expect(save()).toHaveCount(0);
  await finish(4);
  await expect(editor.locator('.editor-document-meta')).not.toContainText('已保存到博客文件');
  await expect(editor.getByRole('alert')).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log(`PASS ${browserName}: reload/busy retry, stale and duplicate ACKs, newer edits, CAS baseline, detach`);
} finally {
  for (const route of pending.values()) await route.abort().catch(() => {});
  await browser.close();
}

// Exercise real cross-origin HTTP, not intercepted browser requests.
// EDITOR_TEST_URL=http://localhost:4321 EDITOR_TEST_BROWSER=webkit node --import tsx tests/editor/link-service.browser.mjs
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { chromium, expect, webkit } from '@playwright/test';
import { createEditorOGServer } from '../../src/features/editor/server/http.ts';
import { renderLinkPreview } from '../../src/lib/markdown/link-card-template.ts';

const upstream = new URL(process.env.EDITOR_TEST_URL ?? 'http://localhost:4321');
const browserName = process.env.EDITOR_TEST_BROWSER ?? 'chromium';
assert.ok(['chromium', 'webkit'].includes(browserName));
const calls = [];
const server = createEditorOGServer({
  allowedOrigins: '*',
  fetchOG: async (url) => {
    calls.push(url);
    return {
      originUrl: url,
      url,
      title: url.endsWith('/oversized-response') ? 'X'.repeat(300_000) : '来自公开实例的链接卡片',
      description: '跨域抓取成功',
    };
  },
});
const requests = [];
server.on('request', (req) => requests.push({ origin: req.headers.origin, cookie: req.headers.cookie, path: req.url }));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert.ok(address && typeof address !== 'string');
const instance = `http://127.0.0.1:${address.port}`;
const endpoint = `${instance}/api/editor/og`;
// Observe cookies at a real HTTP boundary: WebKit attaches them after Playwright's route interception.
const sameOriginRequests = [];
const site = createServer((req, res) => {
  const incoming = new URL(req.url ?? '/', 'http://fixture.local');
  if (incoming.pathname === '/api/editor/og') {
    sameOriginRequests.push({ cookie: req.headers.cookie, path: req.url });
    res.setHeader('Content-Type', 'application/json');
    if (!req.headers.cookie?.includes('do-not-send=private')) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Preview login required' }));
      return;
    }
    const url = incoming.searchParams.get('url');
    const data = { originUrl: url, url, title: '来自默认服务的链接卡片' };
    res.end(JSON.stringify({ ...data, html: renderLinkPreview(data) }));
    return;
  }
  const request = upstream.protocol === 'https:' ? httpsRequest : httpRequest;
  const proxy = request(
    new URL(req.url ?? '/', upstream),
    {
      method: req.method,
      headers: { ...req.headers, host: upstream.host },
      agent: false,
    },
    (response) => {
      res.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(res);
    },
  );
  proxy.on('error', () => {
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(proxy);
});
await new Promise((resolve) => site.listen(0, '127.0.0.1', resolve));
const siteAddress = site.address();
assert.ok(siteAddress && typeof siteAddress !== 'string');
const origin = new URL(`http://127.0.0.1:${siteAddress.port}`);
const browser = await { chromium, webkit }[browserName].launch();
const errors = [];
const target = 'https://example.org/new-article';
const source = `\uFEFF---\r\ntitle: 公开实例回归 # 原注释\r\ncustom: null\r\n---\r\n\r\n${target}\r\n`;

async function copySource(page) {
  await page.evaluate(() => {
    window.serviceCopiedSource = null;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.serviceCopiedSource = text;
        },
      },
    });
  });
  await page.getByRole('button', { name: '复制', exact: true }).click();
  await expect(page.locator('.editor-status')).toContainText('已复制完整 Markdown');
  return page.evaluate(() => window.serviceCopiedSource);
}

try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1140, height: 815 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    await context.addCookies([{ name: 'do-not-send', value: 'private', url: origin.href, sameSite: 'Lax' }]);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(new URL('/editor', origin).href, { waitUntil: 'domcontentloaded' });
    await page.locator('.cm-content').waitFor();
    await page
      .locator('input[type=file]')
      .setInputFiles({ name: 'instance.md', mimeType: 'text/markdown', buffer: Buffer.from(source) });
    await expect(page.locator('.editor-document-name')).toContainText('公开实例回归');
    if (mobile) await page.getByRole('button', { name: '预览', exact: true }).tap();
    await expect(
      page.locator('iframe[title="实际博文实时预览"]').contentFrame().locator('.link-preview-block h3'),
    ).toContainText('来自默认服务的链接卡片');
    assert.ok(sameOriginRequests.length > 0);
    assert.ok(sameOriginRequests.every((req) => req.cookie?.includes('do-not-send=private')));
    const open = async () => {
      const button = page.getByRole('button', { name: '链接预览服务', exact: true });
      if (mobile) await button.tap();
      else await button.click();
    };
    await open();
    const input = page.getByLabel('实例地址', { exact: true });
    await input.fill('javascript:alert(1)');
    await page.getByRole('button', { name: '使用此实例', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('HTTP');
    await expect(page.getByRole('dialog', { name: '链接预览服务' })).toBeVisible();
    await input.fill(instance);
    await page.getByRole('button', { name: '使用此实例', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const preview = page.locator('iframe[title="实际博文实时预览"]').contentFrame();
    await expect(preview.locator('.link-preview-block h3')).toContainText('来自公开实例的链接卡片');
    await expect(preview.locator('.link-preview-block p')).toContainText('跨域抓取成功');
    assert.equal(await page.evaluate(() => localStorage.getItem('koharu-editor:og-endpoint:v1')), endpoint);
    assert.equal(await copySource(page), source, 'instance changes never alter the Markdown export');
    if (mobile) {
      const rect = await page.getByRole('button', { name: '链接预览服务' }).boundingBox();
      assert.ok(rect && rect.width >= 44 && rect.height >= 44);
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.cm-content')).toContainText(target);
    if (mobile) await page.getByRole('button', { name: '预览', exact: true }).tap();
    await expect(
      page.locator('iframe[title="实际博文实时预览"]').contentFrame().locator('.link-preview-block h3'),
    ).toContainText('来自公开实例的链接卡片');
    await open();
    await expect(page.getByLabel('实例地址')).toHaveValue(endpoint);
    await page.screenshot({ path: `/private/tmp/editor-link-service-${browserName}-${mobile ? 'mobile' : 'desktop'}.png` });
    if (mobile) {
      await page.setViewportSize({ width: 320, height: 568 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        '320px page has no overflow',
      );
      const submit = await page.getByRole('button', { name: '使用此实例' }).boundingBox();
      assert.ok(submit && submit.width >= 44 && submit.height >= 44);
    }
    await page.getByRole('button', { name: '恢复默认' }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('koharu-editor:og-endpoint:v1')), null);
    await open();
    await expect(page.getByLabel('实例地址')).toHaveValue(new URL('/api/editor/og', origin).href);
    await page.getByRole('button', { name: '关闭面板', exact: true }).click();
    assert.equal(await copySource(page), source);
    await open();
    await page.getByLabel('实例地址').fill(instance);
    await page.getByRole('button', { name: '使用此实例', exact: true }).click();
    const oversized = source.replace(target, 'https://example.org/oversized-response');
    await page
      .locator('input[type=file]')
      .setInputFiles({ name: 'oversized.md', mimeType: 'text/markdown', buffer: Buffer.from(oversized) });
    await expect(preview.locator('.link-preview-block p')).toContainText('链接信息获取失败，原链接仍可打开');
    await expect(preview.locator('.link-preview-block a')).toHaveAttribute('href', 'https://example.org/oversized-response');
    assert.equal(await copySource(page), oversized, 'oversized third-party metadata never changes source');
    await context.close();
    console.log(
      `PASS ${browserName}/${mobile ? 'mobile' : 'desktop'}: real public-instance CORS, source privacy, settings persistence/reset and layout`,
    );
  }
  assert.ok(calls.length >= 4);
  assert.ok(calls.every((url) => url === target || url === 'https://example.org/oversized-response'));
  assert.ok(requests.every((req) => req.origin === origin.origin && !req.cookie));
  assert.ok(requests.every((req) => new URL(req.path, instance).searchParams.size === 1));
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  site.closeAllConnections();
  await new Promise((resolve, reject) => site.close((error) => (error ? reject(error) : resolve())));
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

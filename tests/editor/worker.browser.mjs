// Run against an existing dev or production preview server: EDITOR_TEST_URL=http://localhost:4321 node --import tsx tests/editor/worker.browser.mjs
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { decryptContent } from '../../src/lib/crypto/decrypt.ts';

const origin = process.env.EDITOR_TEST_URL ?? 'http://localhost:4321';

const sections = [];
let bytes = 0;
let index = 1;
while (bytes < 200 * 1024) {
  const block = `## 写作与预览 ${index}\n\n编辑器复用博客现有的博文排版，手机和桌面都可以编辑。实时预览应保持输入流畅，正文支持 **加粗**、++下划线++、==高亮== 与 $x^2$。\n\n- 浏览器保存多篇草稿\n- 完整 Markdown 复制和下载\n\n\`\`\`ts title="example-${index}.ts" mark:1\nconst preview = { title: '写作', index: ${index} };\nconsole.log(preview);\n\`\`\`\n\n`;
  sections.push(block);
  bytes += Buffer.byteLength(block);
  index += 1;
}
const source = sections.join('');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push({ url: request.url(), body: request.postData() }));
  const workerRequest = page.waitForRequest((request) => /render\.worker/.test(request.url()), { timeout: 20000 });
  await page.goto(new URL('/editor/preview', origin).href, { waitUntil: 'domcontentloaded' });
  const workerUrl = (await workerRequest).url();
  const result = await page.evaluate(
    async ({ markdown, workerUrl }) => {
      const worker = new Worker(workerUrl, { type: 'module' });
      let id = 0;
      const renderer = {
        render(source, options = {}) {
          return new Promise((resolve, reject) => {
            const jobId = ++id;
            worker.onerror = (event) => reject(new Error(event.message));
            worker.onmessage = (event) => {
              if (event.data.id !== jobId) return;
              if (event.data.error) reject(new Error(event.data.error));
              else resolve(event.data.result);
            };
            worker.postMessage({ id: jobId, source, options });
          });
        },
        destroy() {
          worker.terminate();
        },
      };
      const mathOff = await renderer.render('$x^2$', { contentConfig: { enableMath: true }, math: false });
      const cryptoResult = await renderer.render('**秘密正文**', { password: 'worker-regression-password' });
      const wrapper = new DOMParser().parseFromString(cryptoResult.html, 'text/html').querySelector('.encrypted-post');
      const encrypted = { cipher: wrapper.dataset.cipher, iv: wrapper.dataset.iv, salt: wrapper.dataset.salt };
      const gaps = [];
      let last = performance.now();
      const timer = setInterval(() => {
        const now = performance.now();
        gaps.push(now - last);
        last = now;
      }, 5);
      const started = performance.now();
      const rendered = await renderer.render(markdown);
      const ms = performance.now() - started;
      clearInterval(timer);
      renderer.destroy();
      return {
        ms: Number(ms.toFixed(1)),
        maxGap: Number(Math.max(...gaps).toFixed(1)),
        ticks: gaps.length,
        headingCount: rendered.headings.length,
        htmlLength: rendered.html.length,
        mathDisabled: !mathOff.html.includes('class="katex"') && mathOff.html.includes('$x^2$'),
        encrypted,
      };
    },
    { markdown: source, workerUrl },
  );
  const encrypted = result.encrypted;
  result.cryptoCompatible = (
    await decryptContent(encrypted.cipher, encrypted.iv, encrypted.salt, 'worker-regression-password')
  ).includes('<strong>秘密正文</strong>');
  delete result.encrypted;
  assert.equal(result.headingCount, sections.length);
  assert.equal(result.mathDisabled, true);
  assert.equal(result.cryptoCompatible, true);
  assert.ok(result.ticks > 0, 'main thread continued running timers during long rendering');
  assert.ok(result.maxGap < 150, 'long render should not block the main thread');
  assert.deepEqual(errors, []);
  assert.ok(
    requests.every(
      (request) => !request.url.includes('worker-regression-password') && !request.body?.includes('worker-regression-password'),
    ),
  );
  console.log(JSON.stringify({ bytes, ...result, passwordStayedLocal: true }));
} finally {
  await browser.close();
}

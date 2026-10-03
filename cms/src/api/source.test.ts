import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { Hono } from 'hono';
import { CONTENT_DIR } from '../lib/paths';
import { sourceReadHandler, sourceWriteHandler } from './source';

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'koharu-cms-source-'));
  const contentRoot = path.join(root, CONTENT_DIR);
  await fs.mkdir(contentRoot, { recursive: true });
  const app = new Hono<{ Variables: { projectRoot: string } }>();
  app.use('*', async (c, next) => {
    c.set('projectRoot', root);
    await next();
  });
  app.get('/api/cms/source', sourceReadHandler);
  app.post('/api/cms/source', sourceWriteHandler);
  const source =
    '\uFEFF---\r\n# Preserve this comment\r\ntitle: "Quoted title"\r\nextra: null\r\n---\r\n\r\n:::note\r\n你好 🐱\r\n:::\r\n';
  await fs.writeFile(path.join(contentRoot, 'post.md'), source);
  return {
    app,
    root,
    contentRoot,
    source,
    read: (postId = 'post.md', origin?: string) =>
      app.request(`/api/cms/source?postId=${encodeURIComponent(postId)}`, {
        headers: origin === undefined ? undefined : { origin },
      }),
    write: (body: unknown, headers: Record<string, string> = {}) =>
      app.request('/api/cms/source', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
    cleanup: () => fs.rm(root, { recursive: true, force: true }),
  };
}

test('reads and saves the complete UTF-8 source without rewriting frontmatter or newlines', async (t) => {
  const f = await fixture();
  t.after(f.cleanup);
  const read = await f.read();
  assert.equal(read.status, 200);
  assert.deepEqual(await read.json(), { postId: 'post.md', source: f.source });

  const edited = `${f.source}\r\n{% tabs %}\r\n<!-- tab 自定义 -->\r\n正文\r\n{% endtabs %}\r\n`;
  await fs.chmod(path.join(f.contentRoot, 'post.md'), 0o664);
  const saved = await f.write({ postId: 'post.md', source: edited, expectedSource: f.source });
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), { success: true, postId: 'post.md', source: edited });
  assert.deepEqual(await fs.readFile(path.join(f.contentRoot, 'post.md')), Buffer.from(edited));
  assert.equal((await fs.stat(path.join(f.contentRoot, 'post.md'))).mode & 0o777, 0o664);
  assert.deepEqual(await fs.readdir(f.contentRoot), ['post.md']);
});

test('rejects stale saves and serializes concurrent saves to the same file', async (t) => {
  const f = await fixture();
  t.after(f.cleanup);
  const sourceA = `${f.source}\nA`;
  const sourceB = `${f.source}\nB`;
  const results = await Promise.all([
    f.write({ postId: 'post.md', source: sourceA, expectedSource: f.source }),
    f.write({ postId: 'post.md', source: sourceB, expectedSource: f.source }),
  ]);
  assert.deepEqual(results.map((response) => response.status).sort(), [200, 409]);
  const current = await fs.readFile(path.join(f.contentRoot, 'post.md'), 'utf8');
  assert.ok(current === sourceA || current === sourceB);
  const stale = await f.write({ postId: 'post.md', source: 'lost update', expectedSource: f.source });
  assert.equal(stale.status, 409);
  assert.equal(await fs.readFile(path.join(f.contentRoot, 'post.md'), 'utf8'), current);
  assert.deepEqual(await fs.readdir(f.contentRoot), ['post.md']);
});

test('rejects traversal, invalid extensions, missing files and directories without creating files', async (t) => {
  const f = await fixture();
  t.after(f.cleanup);
  await fs.mkdir(path.join(f.contentRoot, 'directory.md'));
  for (const postId of ['../outside.md', '/tmp/outside.md', 'folder/../post.md', 'post.txt', 'post.md\0', 'a\\b.md']) {
    assert.equal((await f.read(postId)).status, 400, postId);
    assert.equal((await f.write({ postId, source: 'bad', expectedSource: '' })).status, 400, postId);
  }
  assert.equal((await f.read('directory.md')).status, 400);
  assert.equal((await f.read('missing.md')).status, 404);
  assert.equal((await f.write({ postId: 'missing.md', source: 'new', expectedSource: '' })).status, 404);
  assert.equal(await fs.readFile(path.join(f.contentRoot, 'post.md'), 'utf8'), f.source);
  assert.deepEqual((await fs.readdir(f.contentRoot)).sort(), ['directory.md', 'post.md']);
});

test('rejects file and directory symlinks that escape the real content root', async (t) => {
  const f = await fixture();
  t.after(f.cleanup);
  const outside = path.join(f.root, 'outside');
  await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, 'private.md'), 'private');
  await fs.symlink(path.join(outside, 'private.md'), path.join(f.contentRoot, 'escape.md'));
  await fs.symlink(outside, path.join(f.contentRoot, 'escape-dir'));
  for (const postId of ['escape.md', 'escape-dir/private.md']) {
    const read = await f.read(postId);
    assert.equal(read.status, 400, postId);
    assert.equal((await f.write({ postId, source: 'overwrite', expectedSource: 'private' })).status, 400, postId);
    assert.equal((await read.text()).includes(outside), false);
  }
  assert.equal(await fs.readFile(path.join(outside, 'private.md'), 'utf8'), 'private');
});

test('allows only CMS browser origins and trusted local requests without Origin', async (t) => {
  const f = await fixture();
  t.after(f.cleanup);
  for (const origin of ['https://example.com', 'http://localhost:4321', 'http://localhost:4322.evil.test', 'null']) {
    assert.equal((await f.read('post.md', origin)).status, 403, origin);
    assert.equal(
      (await f.write({ postId: 'post.md', source: 'bad', expectedSource: f.source }, { origin })).status,
      403,
      origin,
    );
  }
  for (const origin of ['http://localhost:4322', 'http://127.0.0.1:4322']) {
    assert.equal((await f.read('post.md', origin)).status, 200, origin);
    assert.equal(
      (await f.write({ postId: 'post.md', source: f.source, expectedSource: f.source }, { origin })).status,
      200,
      origin,
    );
  }
  assert.equal((await f.read()).status, 200);
});

test('requires bounded JSON requests with an exact source schema', async (t) => {
  const f = await fixture();
  t.after(f.cleanup);
  const validBody = { postId: 'post.md', source: f.source, expectedSource: f.source };
  assert.equal((await f.write(validBody, { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await f.write(validBody, { 'content-type': 'application/json; charset=utf-8' })).status, 200);
  for (const body of [null, [], {}, { ...validBody, expectedSource: 0 }, { ...validBody, extra: true }]) {
    assert.equal((await f.write(body)).status, 400);
  }
  const malformed = await f.app.request('/api/cms/source', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
  assert.equal(malformed.status, 400);
  const oversized = '中'.repeat(Math.floor((5 * 1024 * 1024) / 3) + 1);
  for (const field of ['source', 'expectedSource']) {
    assert.equal((await f.write({ ...validBody, [field]: oversized })).status, 413, field);
  }
  const transportOverflow = await f.write(validBody, { 'content-length': String(60 * 1024 * 1024 + 8 * 1024 + 1) });
  assert.equal(transportOverflow.status, 413);
  assert.equal(await fs.readFile(path.join(f.contentRoot, 'post.md'), 'utf8'), f.source);
});

test('reads and saves sources above 2.5 MiB, including worst-case JSON control-character escaping', async (t) => {
  const f = await fixture();
  t.after(f.cleanup);
  const original = `${f.source}${'\u0001'.repeat(3 * 1024 * 1024)}`;
  const edited = `${original}\n新增正文\n`;
  await fs.writeFile(path.join(f.contentRoot, 'post.md'), original);
  const read = await f.read();
  assert.equal(read.status, 200);
  assert.equal((await read.json()).source, original);
  const saved = await f.write({ postId: 'post.md', source: edited, expectedSource: original });
  assert.equal(saved.status, 200);
  assert.deepEqual(await fs.readFile(path.join(f.contentRoot, 'post.md')), Buffer.from(edited));
  assert.deepEqual(await fs.readdir(f.contentRoot), ['post.md']);
});

test('enforces the transport budget on streaming requests without Content-Length', async (t) => {
  const f = await fixture();
  t.after(f.cleanup);
  const chunk = new Uint8Array(64 * 1024);
  let sent = 0;
  let canceled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      sent += chunk.byteLength;
      controller.enqueue(chunk);
      if (sent > 61 * 1024 * 1024) controller.close();
    },
    cancel() {
      canceled = true;
    },
  });
  const request = new Request('http://localhost/api/cms/source', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    duplex: 'half',
  } as RequestInit);
  assert.equal((await f.app.request(request)).status, 413);
  assert.equal(canceled, true);
  assert.equal(await fs.readFile(path.join(f.contentRoot, 'post.md'), 'utf8'), f.source);
});

test('rejects invalid UTF-8 files and malformed Unicode instead of replacing source bytes', async (t) => {
  const f = await fixture();
  t.after(f.cleanup);
  await fs.writeFile(path.join(f.contentRoot, 'invalid.md'), Buffer.from([0xff, 0xfe, 0x41]));
  assert.equal((await f.read('invalid.md')).status, 422);
  const result = await f.write({ postId: 'post.md', source: '\ud800', expectedSource: f.source });
  assert.equal(result.status, 400);
  assert.equal(await fs.readFile(path.join(f.contentRoot, 'post.md'), 'utf8'), f.source);
});

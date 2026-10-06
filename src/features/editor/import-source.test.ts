import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fetchMarkdownSource,
  findImportedDraft,
  importFilename,
  MAX_MARKDOWN_BYTES,
  parseImportSource,
  withoutImportParam,
} from './import-source';

const origin = 'https://blog.example';

test('only same-origin paths to .md files are importable', () => {
  assert.equal(parseImportSource('/post/note/foo.md', origin), '/post/note/foo.md');
  assert.equal(parseImportSource('/post/note/foo.md?x=1#y', origin), '/post/note/foo.md');
  assert.equal(parseImportSource('/en/post/%E4%B8%AD%E6%96%87.md', origin), '/en/post/%E4%B8%AD%E6%96%87.md');
  for (const value of [
    null,
    '',
    'post/foo.md',
    'https://blog.example/post/foo.md',
    'https://evil.example/post/foo.md',
    '//evil.example/foo.md',
    '/\\evil.example/foo.md',
    'javascript:alert(1)//.md',
    'data:text/plain,a.md',
    '/post/foo',
    '/post/foo.md.html',
    '/post/foo.md\n',
  ]) {
    assert.equal(parseImportSource(value, origin), null, String(value));
  }
});

test('the import parameter is removed without touching other state in the URL', () => {
  assert.equal(withoutImportParam(`${origin}/editor?from=%2Fpost%2Fa.md`), '/editor');
  assert.equal(withoutImportParam(`${origin}/editor/?a=1&from=%2Fpost%2Fa.md#top`), '/editor/?a=1#top');
});

test('re-imports find the most recently edited copy of the same source', () => {
  const drafts = [
    { id: 'a', title: 'A', updated: 1, importedFrom: '/post/a.md' },
    { id: 'b', title: 'B', updated: 5, importedFrom: '/post/b.md' },
    { id: 'c', title: 'A 新', updated: 3, importedFrom: '/post/a.md' },
    { id: 'd', title: '手写', updated: 9 },
  ];
  assert.equal(findImportedDraft(drafts, '/post/a.md')?.id, 'c');
  assert.equal(findImportedDraft(drafts, '/post/missing.md'), null);
});

test('imported drafts download under the post file name', () => {
  assert.equal(importFilename('/post/note/%E4%B8%AD%E6%96%87.md'), '中文.md');
  assert.equal(importFilename('/post/note/bad%E0.md'), 'bad%E0.md');
});

function respond(body: BodyInit | null, init?: ResponseInit): typeof fetch {
  return async () => new Response(body, init);
}

test('fetching maps failures to readable, recoverable messages', async () => {
  assert.equal(await fetchMarkdownSource('/a.md', respond('---\ntitle: 甲\n---\n')), '---\ntitle: 甲\n---\n');
  await assert.rejects(fetchMarkdownSource('/a.md', respond('missing', { status: 404 })), /找不到/);
  await assert.rejects(fetchMarkdownSource('/a.md', respond('boom', { status: 500 })), /500/);
  await assert.rejects(
    fetchMarkdownSource('/a.md', async () => {
      throw new TypeError('Failed to fetch');
    }),
    /无法连接/,
  );
  await assert.rejects(
    fetchMarkdownSource('/a.md', respond('<html></html>', { headers: { 'Content-Type': 'text/html' } })),
    /不是 Markdown/,
  );
  await assert.rejects(fetchMarkdownSource('/a.md', respond(new Uint8Array(MAX_MARKDOWN_BYTES + 1))), /5 MB/);
  await assert.rejects(fetchMarkdownSource('/a.md', respond(new Uint8Array([0xff, 0xfe, 0xfd]))), /UTF-8/);
});

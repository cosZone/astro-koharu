import assert from 'node:assert/strict';
import test from 'node:test';
import { codeToHtml } from 'shiki';
import { collapsibleCodeTransformer } from './shiki-collapsible-transformer';
import { shokaMetaTransformer } from './shiki-meta-transformer';

async function render(source: string, meta = '') {
  return codeToHtml(source, {
    lang: 'javascript',
    theme: 'github-dark',
    meta: { __raw: meta },
    transformers: [shokaMetaTransformer(), collapsibleCodeTransformer()],
  });
}

test('short blocks reserve their toolbar without becoming collapsible', async () => {
  const html = await render('const value = 1;');
  assert.match(html, /^<div class="code-block-wrapper"><div class="code-block-wrapper-toolbar-mount"><\/div><pre/);
  assert.doesNotMatch(html, /code-collapsed|code-collapsible/);
});

test('only blocks above eight lines start collapsed', async () => {
  assert.doesNotMatch(await render(Array(8).fill('const value = 1;').join('\n')), /code-collapsed/);
  assert.match(await render(Array(9).fill('const value = 1;').join('\n')), /code-collapsible code-collapsed/);
});

test('title placeholders preserve escaped text and link labels without adding an active link', async () => {
  const html = await render('const value = 1;', 'title="A < B" url="https://example.test/code" linkText="Source"');
  assert.match(html, /code-block-title code-block-title-placeholder/);
  assert.match(html, /<span>A &#x3C; B<\/span>/);
  assert.match(html, /<span class="code-block-title-link">Source<\/span>/);
  assert.doesNotMatch(html, /<a /);
});

test('infographic blocks retain their separate enhancement path', async () => {
  assert.doesNotMatch(await render('infographic list-row-simple\ndata\n  title Example'), /code-block-wrapper/);
});

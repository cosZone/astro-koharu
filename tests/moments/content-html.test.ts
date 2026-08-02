import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeKoharuContentHtml } from '../../src/lib/sanitize';

test('preserves Telegram rich text and raw line breaks without corrupting block content', () => {
  const html = [
    '<strong>bold</strong>\n<em>italic</em>\r\n<u>underline</u>\r<s>strike</s>',
    '<code class="language-ts">const answer = 42;</code>',
    '<pre><code class="language-js">console.log(answer);</code></pre>',
    '<blockquote class="tg-expandable-blockquote">quote\ncontinued</blockquote>',
  ].join('\n');

  assert.equal(
    sanitizeKoharuContentHtml(html),
    [
      '<strong>bold</strong>\n<em>italic</em>\n<u>underline</u>\n<s>strike</s>',
      '<code class="language-ts">const answer = 42;</code>',
      '<pre><code class="language-js">console.log(answer);</code></pre>',
      '<blockquote class="tg-expandable-blockquote">quote\ncontinued</blockquote>',
    ].join('\n'),
  );
});

test('keeps multiline code and block boundaries structural', () => {
  const html =
    'before\n<pre><code class="language-c++">line 1\nline 2</code></pre>\n<blockquote>quote\nnext</blockquote>\nafter';

  assert.equal(sanitizeKoharuContentHtml(html), html);
});

test('preserves nested formatting and Suite-normalized UTF-16 entity boundaries', () => {
  const html = '<strong><s>A<em>😀</em>B</s></strong><u>underline</u>';

  assert.equal(sanitizeKoharuContentHtml(html), html);
  assert.equal(sanitizeKoharuContentHtml('A<strong>😀</strong>B'), 'A<strong>😀</strong>B');
});

test('adapts Telegram spoilers to the shared Shoka spoiler component', () => {
  assert.equal(
    sanitizeKoharuContentHtml('<span class="tg-spoiler" onclick="alert(1)">secret</span>'),
    '<spoiler-span>secret</spoiler-span>',
  );
  assert.equal(sanitizeKoharuContentHtml('<span class="tg-spoiler ignored">not hidden</span>'), 'not hidden');
  assert.equal(sanitizeKoharuContentHtml('<spoiler-span>forged</spoiler-span>'), 'forged');
});

test('keeps safe links and strips executable markup and attributes', () => {
  const html = [
    '<a href="https://example.com" target="_blank" onclick="alert(1)">safe</a>',
    '<a href="javascript:alert(1)">unsafe</a>',
    '<img src=x onerror="alert(1)">',
    '<svg><script>alert(1)</script></svg>',
    '<p style="position:fixed">body</p>',
  ].join('');

  const sanitized = sanitizeKoharuContentHtml(html);
  assert.match(sanitized, /<a href="https:\/\/example\.com" rel="nofollow noopener noreferrer">safe<\/a>/);
  assert.match(sanitized, /unsafe/);
  assert.doesNotMatch(sanitized, /<a[^>]*>unsafe<\/a>/);
  assert.match(sanitized, /body/);
  assert.doesNotMatch(sanitized, /<p>/);
  assert.doesNotMatch(sanitized, /javascript:|onclick|onerror|<img|<svg|<script|style=/);
});

test('escapes plain-text fallback before preserving its line breaks', () => {
  assert.equal(
    sanitizeKoharuContentHtml(null, '<img src=x onerror=alert(1)>\nplain'),
    '&lt;img src=x onerror=alert(1)&gt;\nplain',
  );
});

test('keeps escaped markup inert while adding line breaks', () => {
  assert.equal(
    sanitizeKoharuContentHtml('&lt;script&gt;alert(1)&lt;/script&gt;\nnext'),
    '&lt;script&gt;alert(1)&lt;/script&gt;\nnext',
  );
});

test('rejects relative, protocol-relative, credentialed, and control-character links', () => {
  const sanitized = sanitizeKoharuContentHtml(
    '<a href="/relative">relative</a>' +
      '<a href="//example.com/path">protocol relative</a>' +
      '<a href="https://user:pass@example.com">credentials</a>' +
      '<a href="https://exa\nmple.com">control</a>' +
      '<a href=" https://example.com/space">space</a>' +
      '<a href="https://example.com/ok">absolute</a>',
  );

  assert.equal(
    sanitized,
    'relativeprotocol relativecredentialscontrolspace<a href="https://example.com/ok" rel="nofollow noopener noreferrer">absolute</a>',
  );
});

test('keeps exact Suite mail and Telegram link protocols', () => {
  assert.equal(
    sanitizeKoharuContentHtml('<a href="mailto:a@b.dev">mail</a><a href="tg://resolve?phone=%2B86123">telegram</a>'),
    '<a href="mailto:a@b.dev" rel="nofollow noopener noreferrer">mail</a>' +
      '<a href="tg://resolve?phone=%2B86123" rel="nofollow noopener noreferrer">telegram</a>',
  );
});

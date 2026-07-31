import assert from 'node:assert/strict';
import test from 'node:test';
import { renderCodePenEmbed, renderLinkPreview, renderTweetEmbed } from './link-card-template';

/** Byte-exact markup: existing pages and CSS depend on it, so changes must be deliberate. */
const SUCCESS_CARD = `<div class="link-preview-block not-prose" data-state="success">
  <a href="https://example.com/post/1" target="_blank" class="group block overflow-hidden rounded-lg border border-border transition-all hover:border-primary/50 hover:shadow-md" aria-label="Title - example.com">
    <div class="bg-card flex md:flex-col flex-row">
      <div class="flex-1 p-4">
        <div class="mb-2 flex items-center gap-2">
          <img src="https://example.com/favicon.ico" alt="" class="h-4 w-4 shrink-0" loading="lazy" aria-hidden="true" referrerpolicy="no-referrer" />
          <span class="text-muted-foreground truncate text-xs font-medium">example.com</span>
        </div>
        <h3 class="text-foreground mb-2 line-clamp-2 font-semibold leading-tight">Title</h3>
        <p class="text-muted-foreground mb-3 line-clamp-2 text-sm">Desc</p>
        <div class="text-primary flex items-center gap-1 text-xs">
          <span class="truncate">https://example.com/post/1</span>
          <svg class="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" viewBox="0 0 12 12"><path fill="currentColor" d="M4 3.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-.25a.75.75 0 0 1 1.5 0V8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h.25a.75.75 0 0 1 0 1.5zm2.75 0a.75.75 0 0 1 0-1.5h2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-.69L7.28 5.78a.75.75 0 0 1-1.06-1.06L7.44 3.5z"/></svg> 
        </div>
      </div>
      <div class="bg-muted relative md:w-full shrink-0 aspect-1200/630 md:aspect-auto md:max-h-48 w-80"><img src="https://cdn.example.com/og.png" alt="Title" class="link-preview-image h-full md:h-full w-full object-cover" loading="lazy" referrerpolicy="no-referrer" data-fallback-title="Title" /></div>
    </div>
  </a>
</div>`;

const ERROR_CARD = `<div class="link-preview-block not-prose" data-state="error">
  <a href="https://example.com/post/1" target="_blank" class="hover:border-primary/50 group block rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md" aria-label="https://example.com/post/1">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-dasharray="28" stroke-dashoffset="28" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 6l2 -2c1 -1 3 -1 4 0l1 1c1 1 1 3 0 4l-5 5c-1 1 -3 1 -4 0M11 18l-2 2c-1 1 -3 1 -4 0l-1 -1c-1 -1 -1 -3 0 -4l5 -5c1 -1 3 -1 4 0"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="28;0"/></path></svg>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-foreground font-medium truncate">https://example.com/post/1</div>
          <div class="text-muted-foreground text-xs truncate mt-0.5">example.com</div>
        </div>
      </div>
      <svg class="text-primary h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
      </svg>
    </div>
  </a>
</div>`;

test('a fully populated card renders the expected markup byte for byte', () => {
  const html = renderLinkPreview({
    originUrl: 'https://example.com/post/1',
    url: 'https://example.com/post/1',
    title: 'Title',
    description: 'Desc',
    image: 'https://cdn.example.com/og.png',
    logo: 'https://example.com/favicon.ico',
  });
  assert.equal(html, SUCCESS_CARD);
});

test('a failed fetch renders the fallback card byte for byte', () => {
  const html = renderLinkPreview({
    originUrl: 'https://example.com/post/1',
    url: 'https://example.com/post/1',
    error: 'Request timeout',
  });
  assert.equal(html, ERROR_CARD);
});

test('a missing title falls back even without an error', () => {
  const html = renderLinkPreview({ originUrl: 'https://example.com/x', url: 'https://example.com/x' });
  assert.match(html, /data-state="error"/);
});

test('image and logo blocks are omitted when absent', () => {
  const html = renderLinkPreview({ originUrl: 'https://example.com/x', url: 'https://example.com/x', title: 'Only title' });
  assert.match(html, /data-state="success"/);
  assert.equal(html.includes('<img'), false);
  assert.equal(html.includes('link-preview-image'), false);
  assert.equal(html.includes('<p class="text-muted-foreground'), false);
});

test('www is stripped from the displayed domain', () => {
  const html = renderLinkPreview({ originUrl: 'https://www.example.com/x', url: 'https://www.example.com/x', title: 'T' });
  assert.match(html, /font-medium">example\.com</);
});

test('markup in title and description is stripped, not rendered', () => {
  const html = renderLinkPreview({
    originUrl: 'https://example.com/x',
    url: 'https://example.com/x',
    title: '<script>alert(1)</script>Safe',
    description: '<b>bold</b>',
  });
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('<b>'), false);
  assert.match(html, /leading-tight">Safe</);
});

test('quotes in attribute values are escaped', () => {
  const html = renderLinkPreview({
    originUrl: 'https://example.com/x',
    url: 'https://example.com/x',
    title: 'a "quoted" \'title\'',
    image: 'https://cdn.example.com/og.png',
  });
  assert.match(html, /aria-label="a &quot;quoted&quot; &#39;title&#39; - example\.com"/);
  assert.equal(html.includes('alt="a "quoted""'), false);
});

test('non-http URLs are dropped from href and src', () => {
  const html = renderLinkPreview({
    originUrl: 'javascript:alert(1)',
    url: 'https://example.com/x',
    title: 'T',
    image: 'javascript:alert(1)',
    logo: 'data:text/html,<script>',
  });
  assert.match(html, /href=""/);
  assert.equal(html.includes('src="javascript:'), false);
  assert.equal(html.includes('src="data:'), false);
  assert.equal(html.includes('<img'), false);
});

test('ampersands in URL attributes are entity-encoded', () => {
  const html = renderLinkPreview({
    originUrl: 'https://example.com/x?a=1&b=2',
    url: 'https://example.com/x?a=1&b=2',
    title: 'T',
  });
  assert.match(html, /href="https:\/\/example\.com\/x\?a=1&amp;b=2"/);
});

test('a long fallback URL without a subtitle is truncated to 60 chars', () => {
  const long = `https://example.com/${'a'.repeat(80)}`;
  const html = renderLinkPreview({ originUrl: long, url: 'https://example.com/', error: 'x' });
  assert.match(html, /mt-0\.5">https:\/\/example\.com\/a{40}\.\.\.</);
});

test('known hosts get a friendly fallback label', () => {
  const gh = renderLinkPreview({ originUrl: 'https://github.com/org/repo', url: 'https://github.com/org/repo', error: 'x' });
  assert.match(gh, /truncate">GitHub - org\/repo</);

  const pen = renderLinkPreview({
    originUrl: 'https://codepen.io/user/pen/abc',
    url: 'https://codepen.io/user/pen/abc',
    error: 'x',
  });
  assert.match(pen, /truncate">CodePen - user</);
  assert.match(pen, /mt-0\.5">Pen: abc</);
});

test('an unparseable URL degrades to the raw string instead of throwing', () => {
  const html = renderLinkPreview({ originUrl: 'not a url', url: 'not a url', error: 'x' });
  assert.match(html, /data-state="error"/);
  assert.match(html, /truncate">not a url</);
});

test('CodePen embed carries the official data attributes and escapes them', () => {
  assert.equal(
    renderCodePenEmbed('user', 'abc', 'https://codepen.io/user/pen/abc'),
    `<p class="codepen" data-height="400" data-default-tab="result" data-slug-hash="abc" data-user="user">
  <span>See the Pen <a href="https://codepen.io/user/pen/abc">abc</a> by user (<a href="https://codepen.io/user">@user</a>) on <a href="https://codepen.io">CodePen</a>.</span>
</p>`,
  );

  const hostile = renderCodePenEmbed('a"b', 'p<d', 'javascript:x');
  assert.match(hostile, /data-user="a&quot;b"/);
  assert.equal(hostile.includes('javascript:'), false);
});

test('tweet embed renders a hydration placeholder', () => {
  assert.equal(
    renderTweetEmbed('1234567890', 'https://x.com/user/status/1234567890'),
    '<div data-tweet-embed data-tweet-id="1234567890" data-url="https://x.com/user/status/1234567890"></div>',
  );
  assert.equal(renderTweetEmbed('a"b', 'javascript:x'), '<div data-tweet-embed data-tweet-id="a&quot;b" data-url=""></div>');
});

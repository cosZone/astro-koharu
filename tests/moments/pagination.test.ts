import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('marks every cursor-paginated Moments timeline for progressive enhancement', async () => {
  const pages = await Promise.all(
    ['index.astro', 'channel.astro', 'search.astro'].map((page) => read(`src/features/moments/pages/${page}`)),
  );

  for (const page of pages) {
    assert.match(page, /<ol class="moments-timeline[^"]*" data-moments-timeline>/);
    assert.match(page, /<CursorPagination nextHref=\{nextHref\} labels=\{cursorPaginationLabels\} \/>/);
  }
});

test('cursor pagination keeps a link fallback and initializes appended cards with a scoped event', async () => {
  const [pagination, messageCard] = await Promise.all([
    read('src/components/moments/CursorPagination.astro'),
    read('src/components/moments/MessageCard.astro'),
  ]);

  assert.match(pagination, /href=\{nextHref\}/);
  assert.match(pagination, /new IntersectionObserver/);
  assert.match(pagination, /if \(this\.loading \|\| !timeline \|\| !nextHref\) return;/);
  assert.match(pagination, /if \(!response\.ok\)/);
  assert.match(pagination, /new AbortController/);
  assert.match(pagination, /signal: controller\.signal/);
  assert.match(pagination, /this\.loadAbortController\?\.abort\(\)/);
  assert.match(pagination, /pendingIntersectionLoad/);
  assert.match(pagination, /if \(this\.dataset\.state === 'error'\) return;/);
  assert.match(pagination, /this\.setState\('error'/);
  assert.match(pagination, /new CustomEvent\(CONTENT_APPENDED_EVENT/);
  assert.doesNotMatch(pagination, /astro:page-load/);
  assert.match(messageCard, /document\.addEventListener\('moments:content-appended'/);
  assert.match(messageCard, /installMomentCardLinks\(root\)/);
  assert.match(messageCard, /installMomentCopyButtons\(root\)/);
});

test('renders loading as an inline timeline placeholder strip and gently reveals each appended batch', async () => {
  const pagination = await read('src/components/moments/CursorPagination.astro');

  assert.match(pagination, /data-pagination-tail/);
  assert.match(pagination, /min-height: 6\.75rem/);
  assert.match(pagination, /item\.dataset\.momentsEntering = 'true'/);
  assert.match(pagination, /transform: translateY\(10px\)/);
  assert.match(pagination, /transition: opacity 240ms ease-out, transform 240ms ease-out/);
  assert.match(pagination, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(pagination, /motion-safe:animate-spin/);
  assert.match(pagination, /data-status-spinner/);
  assert.match(pagination, /data-pagination-live/);
  assert.match(pagination, /tabindex="-1"/);
  assert.match(pagination, /data-state='loading'] \[data-pagination-status\]/);
  assert.match(pagination, /@keyframes moments-status-in/);
  assert.match(pagination, /MIN_LOADING_INDICATOR_MS/);
  assert.match(pagination, /active:scale-\[0\.96\]/);
  assert.doesNotMatch(
    pagination,
    /data-loading-pill|data-status-marker|data-loading-indicator|data-status-dot|moments-tail-spin/,
  );
  assert.doesNotMatch(pagination, /animation-delay|transition-all/);

  const minimumLoadingWait = pagination.indexOf('const remainingIndicatorMs');
  const appendBatch = pagination.indexOf('timeline.append(...appendedItems)');
  assert.ok(minimumLoadingWait >= 0 && minimumLoadingWait < appendBatch);
});

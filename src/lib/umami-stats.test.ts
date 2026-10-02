import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import type { UmamiConfig } from './config/types';
import { createUmamiStatsConfig, getPageviews } from './umami-stats';

function mockUmami(t: TestContext, counts: Record<string, number | { value: number }>, failurePath?: string) {
  const requests: URL[] = [];
  const config = {
    baseUrl: 'https://analytics.example',
    websiteId: t.name,
    shareToken: t.name,
    startAt: 100,
    endAt: 200,
  };
  t.mock.method(globalThis, 'fetch', async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    requests.push(url);
    if (url.pathname.startsWith('/api/share/')) {
      return Response.json({ token: 'test-jwt', websiteId: config.websiteId });
    }
    assert.equal(url.pathname, `/api/websites/${encodeURIComponent(config.websiteId)}/stats`);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('x-umami-share-token'), 'test-jwt');
    assert.equal(headers.get('x-umami-share-context'), '1');
    assert.equal(url.searchParams.get('startAt'), '100');
    assert.equal(url.searchParams.get('endAt'), '200');
    const path = url.searchParams.get('path') ?? '';
    if (path === failurePath) return new Response('Unavailable', { status: 503 });
    return Response.json({ pageviews: counts[path] ?? 0 });
  });
  return { config, requests, statsRequests: () => requests.filter((url) => url.pathname.endsWith('/stats')) };
}

for (const [name, counts, expected] of [
  ['slash-only hosting', { '/post/example/': 17 }, 17],
  ['slashless hosting', { '/post/example': 23 }, 23],
  ['mixed historical paths', { '/post/example': 23, '/post/example/': { value: 17 } }, 40],
  ['an article without visits', {}, 0],
] as const) {
  test(`article pageviews work with ${name}`, async (t) => {
    const { config, requests, statsRequests } = mockUmami(t, counts);
    assert.equal(await getPageviews({ ...config, path: '/post/example' }), expected);
    assert.deepEqual(
      statsRequests().map((url) => url.searchParams.get('path')),
      ['/post/example', '/post/example/'],
    );
    assert.equal(requests.length, 3, 'resolve the share token once for the two exact queries');
  });
}

test('slash variants share in-flight requests and the completed cache', async (t) => {
  const { config, requests } = mockUmami(t, { '/post/shared/': 42 });
  const pending = getPageviews({ ...config, path: '/post/shared/' });
  assert.equal(getPageviews({ ...config, path: '/post/shared' }), pending);
  assert.equal(await pending, 42);
  assert.equal(await getPageviews({ ...config, path: '/post/shared/' }), 42);
  assert.equal(requests.length, 3);
});

test('root and whole-site pageviews each use one query without doubling counts', async (t) => {
  const { config, statsRequests } = mockUmami(t, { '/': 7, '': { value: 30 } });
  assert.equal(await getPageviews({ ...config, path: '/' }), 7);
  assert.equal(await getPageviews(config), 30);
  assert.deepEqual(
    statsRequests().map((url) => url.searchParams.get('path')),
    ['/', null],
  );
});

test('article queries do not include child routes, similar slugs or another locale', async (t) => {
  const path = '/en/post/a+b.(c)';
  const { config } = mockUmami(t, {
    [path]: 3,
    [`${path}/`]: 4,
    [`${path}/child`]: 100,
    [`${path}-other`]: 200,
    '/post/a+b.(c)': 300,
  });
  assert.equal(await getPageviews({ ...config, path }), 7);
});

test('a failed path query returns unavailable instead of a partial total', async (t) => {
  t.mock.method(console, 'error', () => {});
  const { config, requests } = mockUmami(t, { '/post/failure': 20 }, '/post/failure/');
  assert.equal(await getPageviews({ ...config, path: '/post/failure' }), null);
  assert.equal(await getPageviews({ ...config, path: '/post/failure/' }), null);
  assert.equal(requests.length, 3);
});

test('site configuration remains optional and produces one canonical article cache path', () => {
  const config: UmamiConfig = { enabled: true, endpoint: 'https://analytics.example', id: 'website' };
  assert.equal(createUmamiStatsConfig(config, '/post/example'), null);
  config.statistics_display = { token: 'share-slug', article_page_views: true, footer_site_stats: true };
  assert.equal(createUmamiStatsConfig(config)?.path, undefined);
  assert.equal(createUmamiStatsConfig(config, '/')?.path, '/');
  assert.deepEqual(createUmamiStatsConfig(config, '/post/example/'), createUmamiStatsConfig(config, '/post/example'));
});

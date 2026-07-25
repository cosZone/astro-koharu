import assert from 'node:assert/strict';
import test from 'node:test';
import { momentsRoutes } from '../../src/features/moments/integration/momentsRoutes';
import { normalizeMomentsConfig } from '../../src/lib/config/moments';

test('injects only the six explicit canonical routes for the default config', () => {
  const integration = momentsRoutes(normalizeMomentsConfig({ enabled: true }));
  const injected: Array<{ pattern: string; prerender?: boolean }> = [];
  const setup = integration.hooks['astro:config:setup'];
  assert.equal(typeof setup, 'function');
  (setup as (options: { injectRoute(route: { pattern: string; prerender?: boolean }): void }) => void)({
    injectRoute: (route) => injected.push(route),
  });

  assert.deepEqual(
    injected.map((route) => route.pattern),
    [
      '/moments',
      '/moments/search',
      '/moments/rss.xml',
      '/moments/[channel]',
      '/moments/[channel]/rss.xml',
      '/moments/[channel]/[message]',
    ],
  );
  assert.ok(injected.every((route) => route.prerender === false));
});

test('injects explicit prefix and channel alias redirects', () => {
  const integration = momentsRoutes(
    normalizeMomentsConfig({
      enabled: true,
      path: 'life/moments',
      pathAliases: ['telegram'],
      channels: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          slug: 'daily',
          aliases: ['old-daily'],
        },
      ],
    }),
  );
  const patterns: string[] = [];
  const setup = integration.hooks['astro:config:setup'];
  assert.equal(typeof setup, 'function');
  (setup as (options: { injectRoute(route: { pattern: string }): void }) => void)({
    injectRoute: ({ pattern }) => patterns.push(pattern),
  });

  assert.ok(patterns.includes('/telegram/[channel]/[message]'));
  assert.ok(patterns.includes('/life/moments/old-daily'));
  assert.ok(patterns.includes('/life/moments/old-daily/rss.xml'));
  assert.ok(patterns.includes('/life/moments/old-daily/[message]'));
});

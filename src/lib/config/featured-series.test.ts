import assert from 'node:assert/strict';
import test from 'node:test';
import { enabledFeaturedSeriesSlugs, type FeaturedSeriesContext, normalizeFeaturedSeries } from './featured-series';

const silent = () => {};
const context: FeaturedSeriesContext = {
  categoryMap: { 周刊: 'weekly', 随笔: 'life' },
  reservedRoutes: ['about', 'archives', 'rss.xml'],
  onWarning: silent,
};

test('an absent config resolves to an empty array', () => {
  assert.deepEqual(normalizeFeaturedSeries(undefined, context), []);
  assert.deepEqual(normalizeFeaturedSeries(null, context), []);
});

test('accepts the legacy single-object form and derives the slug from categoryMap', () => {
  assert.deepEqual(normalizeFeaturedSeries({ categoryName: '周刊', label: '周刊' }, context), [
    { categoryName: '周刊', label: '周刊', slug: 'weekly' },
  ]);
});

test('falls back to the "series" slug when the category is unmapped', () => {
  const warnings: string[] = [];
  const result = normalizeFeaturedSeries({ categoryName: '未知' }, { ...context, onWarning: (m) => warnings.push(m) });
  assert.equal(result[0].slug, 'series');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /not found in categoryMap/);
});

test('normalizes explicit slugs to lowercase and trims whitespace', () => {
  const result = normalizeFeaturedSeries([{ categoryName: '周刊', slug: '  Weekly_Digest  ' }], context);
  assert.equal(result[0].slug, 'weekly_digest');
});

test('preserves every other field untouched', () => {
  const item = {
    categoryName: '周刊',
    slug: 'weekly',
    enabled: false,
    fullName: 'Weekly Digest',
    highlightOnHome: true,
    links: { github: 'https://example.com' },
  };
  assert.deepEqual(normalizeFeaturedSeries([item], context), [item]);
});

test('rejects items without a usable categoryName', () => {
  assert.throws(() => normalizeFeaturedSeries([{ label: 'x' }], context), /not a valid FeaturedSeriesItem/);
  assert.throws(() => normalizeFeaturedSeries([{ categoryName: '  ' }], context), /not a valid FeaturedSeriesItem/);
  assert.throws(() => normalizeFeaturedSeries(['weekly'], context), /not a valid FeaturedSeriesItem/);
});

test('rejects slugs with unsafe characters', () => {
  assert.throws(() => normalizeFeaturedSeries([{ categoryName: '周刊', slug: 'week/ly' }], context), /Invalid slug/);
  assert.throws(() => normalizeFeaturedSeries([{ categoryName: '周刊', slug: '周刊' }], context), /Invalid slug/);
});

test('rejects slugs that collide with a reserved route', () => {
  assert.throws(
    () => normalizeFeaturedSeries([{ categoryName: '周刊', slug: 'About' }], context),
    /conflicts with a reserved route/,
  );
});

test('rejects duplicate slugs across entries', () => {
  assert.throws(
    () =>
      normalizeFeaturedSeries(
        [
          { categoryName: '周刊', slug: 'weekly' },
          { categoryName: '随笔', slug: 'Weekly' },
        ],
        context,
      ),
    /Duplicate slug/,
  );
});

test('legacy single-object configs are validated the same way', () => {
  assert.throws(() => normalizeFeaturedSeries({ categoryName: '周刊', slug: 'archives' }, context), /reserved route/);
});

test('enabledFeaturedSeriesSlugs skips explicitly disabled series', () => {
  const series = normalizeFeaturedSeries(
    [
      { categoryName: '周刊', slug: 'weekly' },
      { categoryName: '随笔', slug: 'life', enabled: false },
    ],
    context,
  );
  assert.deepEqual(enabledFeaturedSeriesSlugs(series), ['weekly']);
});

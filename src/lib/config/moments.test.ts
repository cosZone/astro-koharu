import assert from 'node:assert/strict';
import test from 'node:test';
import {
  type MomentsValidationContext,
  normalizeMomentsConfig,
  resolveMomentsChannels,
  resolveMomentsNavigation,
} from './moments';

const FIRST_ID = '550e8400-e29b-41d4-a716-446655440000';
const SECOND_ID = '018f3f7a-2b1c-7def-8abc-1234567890ab';
const context: MomentsValidationContext = {
  reservedRoutes: ['about', 'archives', 'api', 'music', 'rss', 'rss.xml'],
  localeCodes: ['zh', 'en', 'ja'],
  seriesSlugs: ['weekly'],
};

test('normalizes an absent config to a disabled, safe default', () => {
  assert.deepEqual(normalizeMomentsConfig(undefined, context), {
    enabled: false,
    path: 'moments',
    title: '碎碎念',
    description: '记录频道中的日常消息',
    ogImage: undefined,
    pathAliases: [],
    channels: [],
    channelSlugBlocklist: ['about', 'archives', 'api', 'music', 'rss', 'rss.xml', 'zh', 'en', 'ja', 'weekly', 'search'],
  });
});

test('normalizes nested paths, aliases, and channel overrides', () => {
  const result = normalizeMomentsConfig(
    {
      enabled: true,
      path: 'Life/Moments',
      pathAliases: ['Telegram/Archive'],
      channels: [
        {
          id: FIRST_ID.toUpperCase(),
          slug: 'Daily_Notes',
          aliases: ['Old-Daily'],
          title: ' 日常 ',
          primary: true,
          ogImage: ' /img/daily.png ',
        },
      ],
    },
    context,
  );

  assert.equal(result.path, 'life/moments');
  assert.deepEqual(result.pathAliases, ['telegram/archive']);
  assert.deepEqual(result.channels[0], {
    id: FIRST_ID,
    slug: 'daily_notes',
    aliases: ['old-daily'],
    title: '日常',
    primary: true,
    hidden: false,
    ogImage: '/img/daily.png',
  });
});

for (const [label, path] of [
  ['empty', ''],
  ['leading slash', '/moments'],
  ['trailing slash', 'moments/'],
  ['empty segment', 'life//moments'],
  ['dot segment', 'life/../moments'],
  ['query', 'moments?q=1'],
  ['fragment', 'moments#top'],
  ['protocol', 'https://example.com'],
  ['backslash', 'life\\moments'],
  ['percent escape', 'life/%6d'],
  ['Astro parameter', 'life/[slug]'],
] as const) {
  test(`rejects ${label} in a moments prefix`, () => {
    assert.throws(() => normalizeMomentsConfig({ path }, context), /Moments configuration error/);
  });
}

for (const path of ['about', 'about/moments', 'en/moments', 'weekly/moments']) {
  test(`rejects unavailable root ${path}`, () => {
    assert.throws(() => normalizeMomentsConfig({ path }, context), /conflicts with reserved, locale, or featured-series/);
  });
}

test('validates path aliases against canonical and one another', () => {
  assert.throws(
    () => normalizeMomentsConfig({ path: 'moments', pathAliases: ['telegram', 'MOMENTS'] }, context),
    /overlaps path/,
  );
  assert.throws(() => normalizeMomentsConfig({ pathAliases: ['telegram', 'TELEGRAM'] }, context), /overlaps pathAliases\[0\]/);
  assert.throws(() => normalizeMomentsConfig({ path: 'life/moments', pathAliases: ['life'] }, context), /overlaps path/);
});

test('validates channel ids, primary count, and all configured URL names', () => {
  assert.throws(() => normalizeMomentsConfig({ channels: [{ id: 'not-a-uuid' }] }, context), /full suite UUID/);
  assert.throws(
    () =>
      normalizeMomentsConfig(
        {
          channels: [
            { id: FIRST_ID, primary: true },
            { id: SECOND_ID, primary: true },
          ],
        },
        context,
      ),
    /At most one channel/,
  );

  for (const slug of ['search', 'rss.xml', 'about', 'en', 'weekly']) {
    assert.throws(
      () => normalizeMomentsConfig({ channels: [{ id: FIRST_ID, slug }] }, context),
      /conflicts with reserved, locale, or featured-series/,
    );
  }
  assert.throws(
    () =>
      normalizeMomentsConfig(
        {
          channels: [
            { id: FIRST_ID, slug: 'daily' },
            { id: SECOND_ID, slug: 'second', aliases: ['DAILY'] },
          ],
        },
        context,
      ),
    /duplicates channels\[0\]\.slug/,
  );
});

test('resolves configured channels first and appends unconfigured suite channels', () => {
  const config = normalizeMomentsConfig(
    {
      enabled: true,
      channels: [{ id: SECOND_ID, slug: 'configured', title: '覆盖标题', hidden: false }],
    },
    context,
  );
  const result = resolveMomentsChannels(config, [
    { id: FIRST_ID, title: 'First', username: 'First_User' },
    { id: SECOND_ID, title: 'Second', username: 'second_user' },
  ]);

  assert.deepEqual(
    result.map(({ id, slug, title, primary }) => ({ id, slug, title, primary })),
    [
      { id: SECOND_ID, slug: 'configured', title: '覆盖标题', primary: true },
      { id: FIRST_ID, slug: 'first_user', title: 'First', primary: false },
    ],
  );
});

test('uses username then full UUID fallback, and never selects a hidden primary', () => {
  const config = normalizeMomentsConfig(
    { channels: [{ id: FIRST_ID, primary: true, hidden: true }, { id: SECOND_ID }] },
    context,
  );
  const result = resolveMomentsChannels(config, [
    { id: FIRST_ID, title: 'Hidden', username: 'search' },
    { id: SECOND_ID, title: 'Visible', username: null },
  ]);

  assert.equal(result[0].slug, FIRST_ID);
  assert.equal(result[0].primary, false);
  assert.equal(result[1].slug, SECOND_ID);
  assert.equal(result[1].primary, true);
});

test('fails when resolved custom, username, UUID, or alias URLs collide', () => {
  const config = normalizeMomentsConfig({
    channels: [{ id: FIRST_ID, slug: 'first', aliases: ['same'] }],
  });
  assert.throws(
    () =>
      resolveMomentsChannels(config, [
        { id: FIRST_ID, title: 'First', username: 'first' },
        { id: SECOND_ID, title: 'Second', username: 'same' },
      ]),
    /Resolved channel URL "same" collides/,
  );
});

test('removes a disabled moments placeholder, including an emptied parent', () => {
  const navigation = [
    { name: 'Home', path: '/' },
    { name: 'Features', children: [{ feature: 'moments' as const }] },
    { name: 'About', path: '/about' },
  ];
  assert.deepEqual(resolveMomentsNavigation(navigation, normalizeMomentsConfig(undefined)), [
    { name: 'Home', path: '/', children: undefined },
    { name: 'About', path: '/about', children: undefined },
  ]);
});

test('replaces an enabled placeholder in place with a canonical-only link', () => {
  const result = resolveMomentsNavigation(
    [
      { name: 'Home', path: '/' },
      { feature: 'moments', icon: 'custom:icon' },
      { name: 'About', path: '/about' },
    ],
    normalizeMomentsConfig({ enabled: true, path: 'life/moments', title: '动态' }),
  );
  assert.deepEqual(result[1], {
    name: '动态',
    path: '/life/moments',
    icon: 'custom:icon',
    localeIndependent: true,
  });
});

test('injects enabled moments immediately after a nested archives item', () => {
  const result = resolveMomentsNavigation(
    [
      { name: 'Home', path: '/' },
      {
        name: 'Posts',
        children: [
          { name: 'Tags', path: '/tags' },
          { name: 'Archives', path: '/archives' },
        ],
      },
      { name: 'About', path: '/about' },
    ],
    normalizeMomentsConfig({ enabled: true }),
  );
  assert.deepEqual(
    result[1].children?.map((item) => item.path),
    ['/tags', '/archives', '/moments'],
  );
  assert.equal(result[2].path, '/about');
});

test('appends enabled moments when navigation has no archives or placeholder', () => {
  const result = resolveMomentsNavigation([{ name: 'Home', path: '/' }], normalizeMomentsConfig({ enabled: true }));
  assert.equal(result.at(-1)?.path, '/moments');
});

test('rejects duplicate moments navigation placeholders', () => {
  assert.throws(
    () =>
      resolveMomentsNavigation(
        [{ feature: 'moments' }, { children: [{ feature: 'moments' }] }],
        normalizeMomentsConfig({ enabled: true }),
      ),
    /at most one/,
  );
});

test('requires an explicit canonical slug for channel aliases', () => {
  assert.throws(
    () =>
      normalizeMomentsConfig({
        channels: [{ id: FIRST_ID, aliases: ['old-daily'] }],
      }),
    /slug.*required when channel aliases/,
  );
});

test('accepts safe public and HTTPS OG images and rejects unsafe values', () => {
  assert.equal(normalizeMomentsConfig({ ogImage: '/img/moments.png' }).ogImage, '/img/moments.png');
  assert.equal(
    normalizeMomentsConfig({ ogImage: 'https://cdn.example.com/moments.png' }).ogImage,
    'https://cdn.example.com/moments.png',
  );
  for (const ogImage of ['img/relative.png', 'http://cdn.example.com/image.png', '/../secret', '//cdn.example.com/image.png']) {
    assert.throws(() => normalizeMomentsConfig({ ogImage }), /safe public path or an absolute HTTPS URL/);
  }
});

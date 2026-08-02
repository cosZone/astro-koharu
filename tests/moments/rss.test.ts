import assert from 'node:assert/strict';
import test from 'node:test';
import type { PublicMessage } from '@coszone/koharu-astro';
import { buildMomentsRss } from '../../src/features/moments/lib/rss';
import { normalizeMomentsConfig, type ResolvedMomentsChannel } from '../../src/lib/config/moments';

const channel: ResolvedMomentsChannel = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  slug: 'daily',
  title: 'Daily',
  username: 'daily_channel',
  primary: true,
  hidden: false,
  aliases: [],
};

const message: PublicMessage = {
  id: '018f3f7a-2b1c-7def-8abc-1234567890ab',
  channel: { id: channel.id, title: channel.title, username: channel.username ?? null },
  content: { kind: 'text', text: 'Stable RSS item', html: '<p>Edited body</p>', entities: [] },
  media: [],
  mediaGroupId: null,
  authorSignature: null,
  publishedAt: '2026-07-25T12:00:00.000Z',
  revision: 2,
  sourceUrl: 'https://t.me/daily_channel/1',
};

test('uses the suite UUID as a stable non-permalink GUID and links back to the blog', async () => {
  const response = await buildMomentsRss({
    channels: [channel],
    config: normalizeMomentsConfig({ enabled: true }),
    description: 'Moments',
    messages: [message],
    site: new URL('https://blog.example.com'),
    title: 'Moments',
  });
  const xml = await response.text();

  assert.match(xml, /<guid isPermaLink="false">urn:uuid:018f3f7a-2b1c-7def-8abc-1234567890ab<\/guid>/);
  assert.match(xml, /https:\/\/blog\.example\.com\/moments\/daily\/018f3f7a-2b1c-7def-8abc-1234567890ab/);
  assert.match(xml, /Sat, 25 Jul 2026 12:00:00 GMT/);
  assert.match(xml, /Edited body/);
});

test('sanitizes RSS rich text, retains raw newlines, and makes spoilers visible', async () => {
  const unsafeMessage = {
    ...message,
    content: {
      kind: 'text' as const,
      text: 'first\nsecond',
      html: '<strong>first</strong>\n<span class="tg-spoiler">second</span><script>alert(1)</script>',
      entities: [],
    },
  } satisfies PublicMessage;
  const response = await buildMomentsRss({
    channels: [channel],
    config: normalizeMomentsConfig({ enabled: true }),
    description: 'Moments',
    messages: [unsafeMessage],
    site: new URL('https://blog.example.com'),
    title: 'Moments',
  });
  const xml = await response.text();

  assert.match(xml, /&lt;strong&gt;first&lt;\/strong&gt;\nsecond/);
  assert.doesNotMatch(xml, /spoiler-span/);
  assert.doesNotMatch(xml, /&lt;script|alert\(1\)/);
});

test('emits one RSS item for a contiguous media album', async () => {
  const album = [
    {
      ...message,
      media: [
        {
          id: '018f3f7a-2b1c-7def-8abc-1234567890ac',
          kind: 'photo' as const,
          cacheStatus: 'unavailable' as const,
          duration: null,
          fileName: 'first.jpg',
          fileSize: '1024',
          height: 640,
          mimeType: 'image/jpeg',
          originalUrl: null,
          thumbnailUrl: null,
          width: 960,
        },
      ],
      sourceUrl: 'https://t.me/daily_channel/10',
    },
    {
      ...message,
      id: '018f3f7a-2b1c-7def-8abc-1234567890ad',
      content: { kind: 'none' as const, text: null, html: null, entities: [] },
      media: [
        {
          id: '018f3f7a-2b1c-7def-8abc-1234567890ae',
          kind: 'photo' as const,
          cacheStatus: 'unavailable' as const,
          duration: null,
          fileName: 'second.jpg',
          fileSize: '2048',
          height: 640,
          mimeType: 'image/jpeg',
          originalUrl: null,
          thumbnailUrl: null,
          width: 960,
        },
      ],
      sourceUrl: 'https://t.me/daily_channel/11',
    },
  ] satisfies PublicMessage[];

  const response = await buildMomentsRss({
    channels: [channel],
    config: normalizeMomentsConfig({ enabled: true }),
    description: 'Moments',
    messages: album,
    site: new URL('https://blog.example.com'),
    title: 'Moments',
  });
  const xml = await response.text();

  assert.equal(xml.match(/<item>/g)?.length, 1);
  assert.match(xml, new RegExp(`urn:uuid:${message.id}`));
});

test('keeps the album GUID stable when a caption is added to another member', async () => {
  const first = {
    ...message,
    content: { kind: 'none' as const, text: null, html: null, entities: [] },
    media: [
      {
        id: '018f3f7a-2b1c-7def-8abc-1234567890ac',
        kind: 'photo' as const,
        cacheStatus: 'unavailable' as const,
        duration: null,
        fileName: 'first.jpg',
        fileSize: '1024',
        height: 640,
        mimeType: 'image/jpeg',
        originalUrl: null,
        thumbnailUrl: null,
        width: 960,
      },
    ],
    mediaGroupId: 'album-1',
    sourceUrl: 'https://t.me/daily_channel/10',
  } satisfies PublicMessage;
  const second = {
    ...first,
    id: '018f3f7a-2b1c-7def-8abc-1234567890ad',
    media: [{ ...first.media[0], id: '018f3f7a-2b1c-7def-8abc-1234567890ae', fileName: 'second.jpg' }],
    sourceUrl: 'https://t.me/daily_channel/11',
  } satisfies PublicMessage;
  const editedSecond = {
    ...second,
    content: { kind: 'caption' as const, text: 'Added later', html: '<p>Added later</p>', entities: [] },
    revision: 2,
  } satisfies PublicMessage;
  const config = normalizeMomentsConfig({ enabled: true });
  const common = {
    channels: [channel],
    config,
    description: 'Moments',
    site: new URL('https://blog.example.com'),
    title: 'Moments',
  };

  const before = await (await buildMomentsRss({ ...common, messages: [first, second] })).text();
  const after = await (await buildMomentsRss({ ...common, messages: [first, editedSecond] })).text();

  const expectedGuid = `<guid isPermaLink="false">urn:uuid:${first.id}</guid>`;
  assert.match(before, new RegExp(expectedGuid));
  assert.match(after, new RegExp(expectedGuid));
  assert.match(before, new RegExp(`https://blog\\.example\\.com/moments/daily/${first.id}`));
  assert.match(after, new RegExp(`https://blog\\.example\\.com/moments/daily/${editedSecond.id}`));
  assert.match(after, /Added later/);
});

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

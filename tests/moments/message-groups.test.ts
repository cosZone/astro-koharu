import assert from 'node:assert/strict';
import test from 'node:test';
import type { PublicMedia, PublicMessage } from '@coszone/koharu-astro';
import { groupMomentMessages } from '../../src/features/moments/lib/message-groups';
import type { ResolvedMomentsChannel } from '../../src/lib/config/moments';

const channel: ResolvedMomentsChannel = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  slug: 'daily',
  title: 'Daily',
  username: 'daily_channel',
  primary: true,
  hidden: false,
  aliases: [],
};

function media(id: number): PublicMedia {
  return {
    id: `018f3f7a-2b1c-7def-8abc-${String(id).padStart(12, '0')}`,
    kind: 'photo',
    cacheStatus: 'unavailable',
    duration: null,
    fileName: `photo-${id}.jpg`,
    fileSize: '1024',
    height: 640,
    mimeType: 'image/jpeg',
    originalUrl: null,
    thumbnailUrl: null,
    width: 960,
  };
}

function message(
  sourceId: number,
  options: {
    mediaGroupId?: string | null;
    publishedAt?: string;
    text?: string;
    withMedia?: boolean;
  } = {},
): PublicMessage {
  const text = options.text ?? '';
  return {
    id: `018f3f7a-2b1c-7def-8abc-${String(sourceId).padStart(12, '0')}`,
    channel: { id: channel.id, title: channel.title, username: channel.username ?? null },
    content: { kind: text ? 'caption' : 'none', text: text || null, html: text ? `<p>${text}</p>` : null, entities: [] },
    media: options.withMedia === false ? [] : [media(sourceId)],
    mediaGroupId: options.mediaGroupId ?? null,
    authorSignature: null,
    publishedAt: options.publishedAt ?? '2026-07-31T06:23:35.000Z',
    revision: 1,
    sourceUrl: `https://t.me/daily_channel/${sourceId}`,
  };
}

test('merges a Telegram Desktop album using conservative export signals', () => {
  const messages = [message(3902, { text: '#碎碎念 正文' }), message(3903), message(3904)];
  const groups = groupMomentMessages(messages);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].anchor.id, messages[0].id);
  assert.equal(groups[0].primary.id, messages[0].id);
  assert.deepEqual(
    groups[0].messages.map((item) => item.sourceUrl),
    messages.map((item) => item.sourceUrl),
  );
  assert.deepEqual(
    groups[0].messages.flatMap((item) => item.media.map((attachment) => attachment.id)),
    messages.map((item) => item.media[0].id),
  );
});

test('uses an explicit mediaGroupId without relying on source URL inference', () => {
  const messages = [
    { ...message(10, { mediaGroupId: 'album-1', text: 'caption' }), sourceUrl: null },
    {
      ...message(99, { mediaGroupId: 'album-1', publishedAt: '2026-07-31T06:23:36.000Z' }),
      sourceUrl: null,
    },
  ];

  assert.equal(groupMomentMessages(messages).length, 1);
});

test('keeps the stable album anchor when a caption is added to another member', () => {
  const before = [message(10), message(11)];
  const after = [message(10), message(11, { text: 'Added later' })];

  assert.equal(groupMomentMessages(before)[0].anchor.id, before[0].id);
  assert.equal(groupMomentMessages(after)[0].anchor.id, before[0].id);
  assert.equal(groupMomentMessages(after)[0].primary.id, after[1].id);
});

test('does not infer an album from a timestamp alone', () => {
  const nonConsecutive = [message(3902, { text: 'caption' }), message(3904)];
  const multipleCaptions = [message(3902, { text: 'first' }), message(3903, { text: 'second' })];
  const missingMedia = [message(3902, { text: 'caption' }), message(3903, { withMedia: false })];

  assert.equal(groupMomentMessages(nonConsecutive).length, 2);
  assert.equal(groupMomentMessages(multipleCaptions).length, 2);
  assert.equal(groupMomentMessages(missingMedia).length, 2);
});

test('never infers more members than one Telegram album can contain', () => {
  const messages = Array.from({ length: 11 }, (_, index) => message(100 + index));
  const groups = groupMomentMessages(messages);

  assert.deepEqual(
    groups.map((group) => group.messages.length),
    [10, 1],
  );
});

test('keeps an album separate when it touches an unknown cursor boundary', () => {
  const messages = [message(3902, { text: 'caption' }), message(3903), message(3904)];

  assert.equal(groupMomentMessages(messages, { separateFirst: true }).length, 3);
  assert.equal(groupMomentMessages(messages, { separateLast: true }).length, 3);
});

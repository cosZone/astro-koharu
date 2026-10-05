import assert from 'node:assert/strict';
import test from 'node:test';
import { continuesMomentConversation, groupMomentConversations } from '../../src/features/moments/lib/message-groups';

function message(minutes: number, channel = 'daily', authorSignature: string | null = null) {
  return { channel: { id: channel }, authorSignature, publishedAt: new Date(Date.UTC(2026, 9, 6, 0, minutes)).toISOString() };
}

test('groups adjacent messages at the inclusive ten-minute boundary in either feed order', () => {
  const messages = [message(0), message(10), message(20), message(31)];
  assert.deepEqual(groupMomentConversations(messages), [messages.slice(0, 3), messages.slice(3)]);
  assert.deepEqual(groupMomentConversations(messages.toReversed()), [messages.slice(3), messages.slice(0, 3).toReversed()]);
});

test('separates messages even one millisecond beyond the boundary', () => {
  const first = message(0);
  const second = { ...message(10), publishedAt: new Date(Date.parse(first.publishedAt) + 600_001).toISOString() };
  assert.equal(continuesMomentConversation(first, second), false);
});

test('never joins different authors or channels, or skips an intervening message', () => {
  const messages = [
    message(0, 'daily', 'Alice'),
    message(1, 'daily', 'Bob'),
    message(2, 'daily', 'Alice'),
    message(3, 'other', 'Alice'),
  ];
  assert.equal(groupMomentConversations(messages).length, 4);
  assert.equal(continuesMomentConversation(message(0), message(1, 'daily', 'Alice')), false);
});

test('treats missing signatures as the channel author and supports exact simultaneous timestamps', () => {
  const first = message(0);
  const second = { ...first, authorSignature: undefined };
  assert.deepEqual(groupMomentConversations([first, second]), [[first, second]]);
});

test('can join a midnight boundary without losing the date of either message', () => {
  const first = { ...message(0), publishedAt: '2026-10-05T23:59:00Z' };
  const second = { ...message(0), publishedAt: '2026-10-06T00:01:00Z' };
  assert.deepEqual(groupMomentConversations([first, second]), [[first, second]]);
});

test('invalid dates stand alone, empty and singleton inputs are stable, and inputs are not mutated', () => {
  const first = Object.freeze({ ...message(0), publishedAt: 'invalid' });
  const second = Object.freeze(message(1));
  const messages = Object.freeze([first, second]);
  assert.deepEqual(groupMomentConversations(messages), [[first], [second]]);
  assert.deepEqual(groupMomentConversations([]), []);
  assert.deepEqual(groupMomentConversations([second]), [[second]]);
  assert.deepEqual(messages, [first, second]);
});

test('conversation grouping preserves message objects, media and permanent-link identities', () => {
  const first = { ...message(0), id: 'first', permalink: '/moments/daily/first', media: [{ id: 'photo' }] };
  const second = { ...message(2), id: 'second', permalink: '/moments/daily/second', media: [] };
  const [group] = groupMomentConversations([first, second]);
  assert.equal(group[0], first);
  assert.equal(group[1], second);
  assert.deepEqual(group[0].media, [{ id: 'photo' }]);
  assert.equal(group[1].permalink, '/moments/daily/second');
});

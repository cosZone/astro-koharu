import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveMusicCover, sizedMusicCover } from './music-cover';

test('sizes NetEase CDN covers and preserves unrelated query parameters', () => {
  assert.equal(
    sizedMusicCover('https://p3.music.126.net/cover.jpg?token=sample&param=800y800'),
    'https://p3.music.126.net/cover.jpg?token=sample&param=200y200',
  );
  for (const source of ['/cover.jpg', 'https://example.com/cover.jpg', 'https://p3.music.126.net.example.com/cover.jpg']) {
    assert.equal(sizedMusicCover(source), source);
  }
});

test('resolves redirected Meting cover headers without fetching original image bytes', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async (_url: URL, init: RequestInit) => {
    assert.equal(init.method, 'HEAD');
    return { ok: true, url: 'https://p1.music.126.net/cover.jpg' };
  });
  const signal = new AbortController().signal;
  assert.equal(
    await resolveMusicCover('https://music.example/?server=netease&type=pic&id=42', signal),
    'https://p1.music.126.net/cover.jpg?param=200y200',
  );
  assert.equal(fetch.mock.callCount(), 1);
});

test('preserves custom covers and falls back when a proxy does not support HEAD', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Unavailable');
  });
  const signal = new AbortController().signal;
  assert.equal(await resolveMusicCover('/cover.jpg', signal), '/cover.jpg');
  assert.equal(
    await resolveMusicCover('https://music.example/?server=tencent&type=pic&id=42', signal),
    'https://music.example/?server=tencent&type=pic&id=42',
  );
  assert.equal(fetch.mock.callCount(), 0);
  const source = 'https://music.example/?server=netease&type=pic&id=42';
  assert.equal(await resolveMusicCover(source, signal), source);
});

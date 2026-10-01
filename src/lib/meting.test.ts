import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { fetchMeting, type MetingSong } from './meting';

const song: MetingSong = {
  name: 'Test song',
  artist: 'Test artist',
  url: 'http://163.hyc.moe?server=netease&type=url&id=42',
  pic: 'http://163.hyc.moe?server=netease&type=pic&id=42',
  lrc: 'http://163.hyc.moe?server=netease&type=lrc&id=42&format=lrc',
};

function mockMeting(t: TestContext, songs: MetingSong[]) {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  t.after(() => {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json(songs));
  return { storage, fetch };
}

test('HTTPS Meting responses use HTTPS for lyrics and media on the API host', async (t) => {
  mockMeting(t, [song]);
  const [resolved] = await fetchMeting('netease', 'playlist', '42');
  for (const field of ['url', 'pic', 'lrc'] as const) {
    const expected = new URL(song[field]);
    expected.protocol = 'https:';
    assert.equal(resolved[field], expected.href);
  }
});

test('old cached HTTP lyric addresses are repaired without refetching the playlist', async (t) => {
  const { storage, fetch } = mockMeting(t, []);
  storage.set('meting:netease:playlist:42', JSON.stringify({ data: [song], timestamp: Date.now() }));
  const [resolved] = await fetchMeting('netease', 'playlist', '42');
  assert.equal(new URL(resolved.lrc).protocol, 'https:');
  assert.equal(fetch.mock.callCount(), 0);
});

test('custom HTTPS APIs upgrade their own lyric URLs and preserve other hosts and ports', async (t) => {
  mockMeting(t, [
    {
      ...song,
      lrc: 'http://music.example/api/?type=lrc&id=42',
      url: 'http://cdn.example/song.mp3',
      pic: 'http://music.example:8080/cover.jpg',
    },
  ]);
  const [resolved] = await fetchMeting('netease', 'playlist', '42', 'https://music.example/api/');
  assert.equal(resolved.lrc, 'https://music.example/api/?type=lrc&id=42');
  assert.equal(resolved.url, 'http://cdn.example/song.mp3');
  assert.equal(resolved.pic, 'http://music.example:8080/cover.jpg');
});

test('an explicitly configured HTTP API keeps its HTTP resource URLs', async (t) => {
  mockMeting(t, [song]);
  const [resolved] = await fetchMeting('netease', 'playlist', '42', 'http://163.hyc.moe/');
  assert.deepEqual(resolved, song);
});

test('inline lyrics, relative assets, and absent lyrics remain unchanged', async (t) => {
  const inline = { ...song, lrc: '[00:00.00]Inline lyrics', pic: '/cover.jpg', url: 'https://163.hyc.moe/song.mp3' };
  const noLyrics = { ...song, lrc: '', pic: '', url: '/song.mp3' };
  mockMeting(t, [inline, noLyrics]);
  const resolved = await fetchMeting('netease', 'playlist', '42');
  assert.deepEqual(resolved, [inline, noLyrics]);
});

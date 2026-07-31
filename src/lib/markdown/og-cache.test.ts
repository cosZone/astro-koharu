import assert from 'node:assert/strict';
import test from 'node:test';
import { createOGCache, ERROR_CACHE_TTL, type OGCacheData, type OGCacheStore } from './og-cache';

const DAY = 24 * 60 * 60 * 1000;

function memoryStore(initial: OGCacheData = {}): OGCacheStore & { data: OGCacheData; writes: number } {
  return {
    data: initial,
    writes: 0,
    read() {
      return structuredClone(this.data);
    },
    write(next) {
      this.data = next;
      this.writes++;
    },
  };
}

test('reads and writes round-trip through the store', () => {
  const store = memoryStore();
  const cache = createOGCache({ successTtl: 30 * DAY, store });

  assert.equal(cache.get('https://a.test/'), null);
  cache.set('https://a.test/', { originUrl: 'https://a.test/', url: 'https://a.test/', title: 'A' });
  assert.deepEqual(cache.get('https://a.test/')?.title, 'A');

  cache.flush();
  assert.equal(store.writes, 1);
  assert.equal(store.data['https://a.test/'].data.title, 'A');
});

test('flush is a no-op when nothing was set', () => {
  const store = memoryStore({
    'https://a.test/': { data: { originUrl: 'https://a.test/', url: 'https://a.test/', title: 'A' }, timestamp: Date.now() },
  });
  const cache = createOGCache({ successTtl: 30 * DAY, store });
  cache.get('https://a.test/');
  cache.flush();
  assert.equal(store.writes, 0);
});

test('expired success entries are misses; error entries expire on their own TTL', () => {
  const now = Date.now();
  const store = memoryStore({
    stale: { data: { originUrl: 'stale', url: 'stale', title: 'S' }, timestamp: now - 31 * DAY },
    fresh: { data: { originUrl: 'fresh', url: 'fresh', title: 'F' }, timestamp: now - 1 * DAY },
    failed: { data: { originUrl: 'failed', url: 'failed', error: 'boom' }, timestamp: now - 2 * DAY },
  });
  const cache = createOGCache({ successTtl: 30 * DAY, store });

  assert.equal(cache.get('stale'), null);
  assert.equal(cache.get('fresh')?.title, 'F');
  assert.equal(cache.get('failed'), null, `error entries live only ${ERROR_CACHE_TTL}ms`);
});

test('expired entries are pruned on write', () => {
  const store = memoryStore({
    stale: { data: { originUrl: 'stale', url: 'stale', title: 'S' }, timestamp: Date.now() - 31 * DAY },
  });
  const cache = createOGCache({ successTtl: 30 * DAY, store });
  cache.set('new', { originUrl: 'new', url: 'new', title: 'N' });
  cache.flush();

  assert.deepEqual(Object.keys(store.data), ['new']);
});

test('a concurrent writer entry survives our flush', () => {
  const store = memoryStore();
  const ours = createOGCache({ successTtl: 30 * DAY, store });
  const theirs = createOGCache({ successTtl: 30 * DAY, store });

  ours.set('https://ours.test/', { originUrl: 'https://ours.test/', url: 'https://ours.test/', title: 'Ours' });
  theirs.set('https://theirs.test/', { originUrl: 'https://theirs.test/', url: 'https://theirs.test/', title: 'Theirs' });

  theirs.flush();
  ours.flush();

  assert.deepEqual(Object.keys(store.data).sort(), ['https://ours.test/', 'https://theirs.test/']);
});

test('our own writes win over a stale on-disk copy of the same URL', () => {
  const store = memoryStore({
    'https://a.test/': { data: { originUrl: 'https://a.test/', url: 'https://a.test/', title: 'Old' }, timestamp: Date.now() },
  });
  const cache = createOGCache({ successTtl: 30 * DAY, store });
  cache.set('https://a.test/', { originUrl: 'https://a.test/', url: 'https://a.test/', title: 'New' });
  cache.flush();

  assert.equal(store.data['https://a.test/'].data.title, 'New');
});

test('entries written by others become visible after a flush', () => {
  const store = memoryStore();
  const ours = createOGCache({ successTtl: 30 * DAY, store });
  const theirs = createOGCache({ successTtl: 30 * DAY, store });

  ours.set('https://ours.test/', { originUrl: 'https://ours.test/', url: 'https://ours.test/', title: 'Ours' });
  theirs.set('https://theirs.test/', { originUrl: 'https://theirs.test/', url: 'https://theirs.test/', title: 'Theirs' });
  theirs.flush();

  assert.equal(ours.get('https://theirs.test/'), null);
  ours.flush();
  assert.equal(ours.get('https://theirs.test/')?.title, 'Theirs');
});

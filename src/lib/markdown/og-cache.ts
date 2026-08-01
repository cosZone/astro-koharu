/**
 * File-backed OG metadata cache (`.cache/og-data.json`, intentionally committed to git
 * to accelerate CI/Vercel builds).
 *
 * Writes merge with the on-disk state instead of overwriting it, so concurrent
 * markdown processors (Astro processes several files in parallel) cannot drop
 * each other's entries.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { OGData } from './og-fetcher';

export const DEFAULT_CACHE_TTL_DAYS = 30;
/** Error entries expire quickly so a transient failure is retried on the next build. */
export const ERROR_CACHE_TTL = 1 * 24 * 60 * 60 * 1000;

export interface OGCacheEntry {
  data: OGData;
  timestamp: number;
}

export type OGCacheData = Record<string, OGCacheEntry>;

/** Persistence backend, injectable so the cache can be tested without touching disk. */
export interface OGCacheStore {
  read(): OGCacheData;
  write(data: OGCacheData): void;
}

export interface OGCache {
  /** Cached data for `url`, or null when absent/expired. */
  get(url: string): OGData | null;
  /** Record data in memory; call `flush()` to persist. */
  set(url: string, data: OGData): void;
  /** Merge in-memory changes into the store (no-op when nothing changed). */
  flush(): void;
}

export interface OGCacheOptions {
  /** TTL for successful entries, in milliseconds. */
  successTtl: number;
  errorTtl?: number;
  store?: OGCacheStore;
}

const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'og-data.json');

function createFileCacheStore(filePath: string = CACHE_FILE): OGCacheStore {
  return {
    read() {
      try {
        if (fs.existsSync(filePath)) {
          return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OGCacheData;
        }
      } catch (error) {
        console.warn('[Link Embed] Failed to load cache:', error);
      }
      return {};
    },
    write(data) {
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
      } catch (error) {
        console.warn('[Link Embed] Failed to save cache:', error);
      }
    },
  };
}

export function createOGCache({
  successTtl,
  errorTtl = ERROR_CACHE_TTL,
  store = createFileCacheStore(),
}: OGCacheOptions): OGCache {
  const ttlOf = (entry: OGCacheEntry) => (entry.data.error ? errorTtl : successTtl);
  const isFresh = (entry: OGCacheEntry, now = Date.now()) => now - entry.timestamp < ttlOf(entry);

  let memory: OGCacheData | null = null;
  const pending = new Set<string>();

  const load = (): OGCacheData => {
    memory ??= store.read();
    return memory;
  };

  return {
    get(url) {
      const entry = load()[url];
      if (!entry) return null;
      return isFresh(entry) ? entry.data : null;
    },

    set(url, data) {
      load()[url] = { data, timestamp: Date.now() };
      pending.add(url);
    },

    flush() {
      if (pending.size === 0 || !memory) return;

      // Re-read so entries written by other processors survive; our own writes win.
      const merged: OGCacheData = { ...store.read() };
      for (const url of pending) {
        const entry = memory[url];
        if (entry) merged[url] = entry;
      }

      const now = Date.now();
      const pruned: OGCacheData = {};
      for (const [url, entry] of Object.entries(merged)) {
        if (isFresh(entry, now)) pruned[url] = entry;
      }

      store.write(pruned);
      memory = pruned;
      pending.clear();
    },
  };
}

const sharedCaches = new Map<number, OGCache>();

/**
 * Process-wide cache instance, shared by every plugin instance with the same TTL so
 * one URL is fetched at most once per build (mirrors the previous module-level cache).
 */
export function getSharedOGCache(successTtl: number): OGCache {
  let cache = sharedCaches.get(successTtl);
  if (!cache) {
    cache = createOGCache({ successTtl });
    sharedCaches.set(successTtl, cache);
  }
  return cache;
}

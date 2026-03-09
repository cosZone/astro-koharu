/**
 * Build-time memoization cache for content queries.
 *
 * During Astro SSG builds, every page runs in the same Node.js process.
 * A module-level Map therefore persists for the entire build and can
 * eliminate redundant sort/filter operations (e.g. getSortedPosts called
 * 2000+ times across ~300 post pages).
 *
 * No invalidation is needed — the cache lives exactly as long as the build.
 */

const caches = new Map<string, Map<string, unknown>>();

/**
 * Return a cached value or compute & store it.
 * @param namespace - Logical group (e.g. 'sortedPosts', 'categoryList')
 * @param key       - Discriminator within the group (typically the locale)
 * @param fn        - Async factory that produces the value on cache miss
 */
export async function memoize<T>(namespace: string, key: string, fn: () => Promise<T>): Promise<T> {
  // In dev mode, Astro's own getCollection invalidates on file changes,
  // but this module-level cache persists across HMR — skip it to avoid stale data.
  if (import.meta.env.DEV) return fn();

  let cache = caches.get(namespace);
  if (!cache) {
    cache = new Map();
    caches.set(namespace, cache);
  }
  if (cache.has(key)) return cache.get(key) as T;
  const result = await fn();
  cache.set(key, result);
  return result;
}

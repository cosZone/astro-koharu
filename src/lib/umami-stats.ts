import type { UmamiConfig } from '@lib/config/types';
import type { UmamiSessionStats, UmamiStatsConfig } from '@/types/umami-stats';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getSessionStats(config: UmamiStatsConfig): Promise<UmamiSessionStats> {
  const { baseUrl, websiteId, shareToken, path } = config;

  const url = new URL(baseUrl);
  url.pathname = `/api/websites/${websiteId}/stats`;

  const headers = new Headers({
    accept: 'application/json',
    'x-umami-share-token': shareToken,
  });

  const params = new URLSearchParams();
  params.append('startAt', config.startAt?.toString() || '0');
  params.append('endAt', config.endAt?.toString() || Date.now().toString());
  if (path) params.append('path', path);
  url.search = params.toString();

  const response = await fetch(url.toString(), { method: 'GET', headers });
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Umami API error: ${text}`);
  }
  return await response.json();
}

interface CacheEntry {
  value: number | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<number | null>>();

function getCacheKey(config: UmamiStatsConfig): string {
  return `${config.baseUrl}:${config.websiteId}:${config.path ?? ''}`;
}

export function getPageviews(config: UmamiStatsConfig): Promise<number | null> {
  const key = getCacheKey(config);

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);

  const inflight = inflightRequests.get(key);
  if (inflight) return inflight;

  const promise = getSessionStats(config)
    .then((stats) => {
      const pv = typeof stats.pageviews === 'number' ? stats.pageviews : stats.pageviews.value;
      cache.set(key, { value: pv, expiresAt: Date.now() + CACHE_TTL });
      return pv;
    })
    .catch((error) => {
      console.error('Failed to fetch Umami pageviews:', error);
      cache.set(key, { value: null, expiresAt: Date.now() + CACHE_TTL });
      return null;
    })
    .finally(() => inflightRequests.delete(key));

  inflightRequests.set(key, promise);
  return promise;
}

/** Normalize path to strip trailing slash for consistent Umami matching */
function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

export function createUmamiStatsConfig(config: UmamiConfig, path?: string): UmamiStatsConfig {
  return {
    baseUrl: config.endpoint,
    websiteId: config.id,
    shareToken: config.statistics_display?.token ?? '',
    path: path ? normalizePath(path) : undefined,
  };
}

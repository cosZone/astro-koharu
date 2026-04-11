import type { UmamiConfig } from '@lib/config/types';
import type { UmamiSessionStats, UmamiStatsConfig } from '@/types/umami-stats';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Share slug -> JWT token cache (JWT is short-lived, refresh every 30 min)
const JWT_CACHE_TTL = 30 * 60 * 1000;
let jwtCache: { token: string; expiresAt: number; key: string } | null = null;

/** Exchange a share slug for a JWT token via GET /api/share/<slug> */
async function resolveShareToken(baseUrl: string, shareSlug: string): Promise<string> {
  const key = `${baseUrl}:${shareSlug}`;
  if (jwtCache && jwtCache.key === key && jwtCache.expiresAt > Date.now()) {
    return jwtCache.token;
  }

  const url = new URL(baseUrl);
  const basePath = url.pathname.replace(/\/$/, '');
  url.pathname = `${basePath}/api/share/${encodeURIComponent(shareSlug)}`;

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to resolve share token: ${response.status} ${response.statusText}`);
  }

  const data: { token: string; websiteId: string } = await response.json();
  jwtCache = { token: data.token, expiresAt: Date.now() + JWT_CACHE_TTL, key };
  return data.token;
}

async function getSessionStats(config: UmamiStatsConfig): Promise<UmamiSessionStats> {
  const { baseUrl, websiteId, shareToken: shareSlug, path } = config;

  const jwt = await resolveShareToken(baseUrl, shareSlug);

  const url = new URL(baseUrl);
  const basePath = url.pathname.replace(/\/$/, '');
  url.pathname = `${basePath}/api/websites/${encodeURIComponent(websiteId)}/stats`;

  const headers = new Headers({
    accept: 'application/json',
    'x-umami-share-token': jwt,
  });

  const params = new URLSearchParams();
  // Default to Unix epoch (all-time stats)
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
      if (import.meta.env.DEV) {
        console.warn(
          `[umami-stats] Fetch failed for key "${key}". Check that your Umami endpoint, website ID, and share token are correct in config/site.yaml.`,
        );
      }
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

export function createUmamiStatsConfig(config: UmamiConfig, path?: string): UmamiStatsConfig | null {
  const token = config.statistics_display?.token;
  if (!token) return null;
  return {
    baseUrl: config.endpoint,
    websiteId: config.id,
    shareToken: token,
    path: path ? normalizePath(path) : undefined,
  };
}

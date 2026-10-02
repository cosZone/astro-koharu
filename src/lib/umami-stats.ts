import type { UmamiConfig } from '@lib/config/types';
import type { UmamiSessionStats, UmamiStatsConfig } from '@/types/umami-stats';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Share slug -> resolved share metadata cache (JWT is short-lived, refresh every 30 min)
const SHARE_DATA_CACHE_TTL = 30 * 60 * 1000;

interface UmamiShareData {
  token: string;
  websiteId?: string;
  apiBaseUrl: string;
}

let shareDataCache: { value: UmamiShareData; expiresAt: number; key: string } | null = null;

function getApiBaseUrlCandidates(baseUrl: string): string[] {
  const url = new URL(baseUrl);
  const normalizedBaseUrl = url.toString().replace(/\/+$/, '');
  const candidates = [normalizedBaseUrl];

  // Umami Cloud serves public share APIs under /analytics/us while the tracker
  // script remains at https://cloud.umami.is/script.js. Keep self-hosted
  // endpoints unchanged, but always try the current Cloud app API path first.
  if (url.hostname === 'cloud.umami.is') {
    candidates.unshift(`${url.origin}/analytics/us`);
  }

  return [...new Set(candidates)];
}

function createApiUrl(apiBaseUrl: string, path: string): URL {
  const url = new URL(apiBaseUrl);
  const basePath = url.pathname.replace(/\/$/, '');
  url.pathname = `${basePath}${path}`;
  return url;
}

function isJsonResponse(response: Response): boolean {
  return response.headers.get('content-type')?.includes('application/json') ?? false;
}

async function fetchShareData(apiBaseUrl: string, shareSlug: string): Promise<UmamiShareData | null> {
  const url = createApiUrl(apiBaseUrl, `/api/share/${encodeURIComponent(shareSlug)}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to resolve Umami share token: ${response.status} ${response.statusText}`);
  }
  if (!isJsonResponse(response)) {
    throw new Error(`Unexpected Umami share response content type: ${response.headers.get('content-type') ?? 'unknown'}`);
  }

  const data: { token?: string; websiteId?: string } = await response.json();
  if (!data.token) throw new Error('Umami share response did not include a token');

  return {
    token: data.token,
    websiteId: data.websiteId,
    apiBaseUrl,
  };
}

/** Exchange a share slug for short-lived share metadata via GET /api/share/<slug>. */
async function resolveShareData(baseUrl: string, shareSlug: string): Promise<UmamiShareData> {
  const key = `${baseUrl}:${shareSlug}`;
  if (shareDataCache && shareDataCache.key === key && shareDataCache.expiresAt > Date.now()) {
    return shareDataCache.value;
  }

  for (const apiBaseUrl of getApiBaseUrlCandidates(baseUrl)) {
    const shareData = await fetchShareData(apiBaseUrl, shareSlug);
    if (!shareData) continue;

    shareDataCache = { value: shareData, expiresAt: Date.now() + SHARE_DATA_CACHE_TTL, key };
    return shareData;
  }

  throw new Error('Failed to resolve Umami share token: no compatible share API endpoint responded');
}

function getWebsiteId(configuredWebsiteId: string, shareData: UmamiShareData): string {
  if (!shareData.websiteId) return configuredWebsiteId;

  if (shareData.websiteId !== configuredWebsiteId && import.meta.env?.DEV) {
    console.warn(
      `[umami-stats] Configured website ID "${configuredWebsiteId}" differs from the website ID in the Umami share link "${shareData.websiteId}". Using the share-link website ID for stats requests.`,
    );
  }

  return shareData.websiteId;
}

async function fetchPageviews(config: UmamiStatsConfig): Promise<number> {
  const { baseUrl, websiteId: configuredWebsiteId, shareToken: shareSlug, path } = config;

  const shareData = await resolveShareData(baseUrl, shareSlug);
  const websiteId = getWebsiteId(configuredWebsiteId, shareData);
  const url = createApiUrl(shareData.apiBaseUrl, `/api/websites/${encodeURIComponent(websiteId)}/stats`);

  const headers = new Headers({
    accept: 'application/json',
    'x-umami-share-token': shareData.token,
    // Required by current Umami auth when a share token is used from the public share flow.
    'x-umami-share-context': '1',
  });

  const params = new URLSearchParams();
  // Default to Unix epoch (all-time stats)
  params.append('startAt', config.startAt?.toString() || '0');
  params.append('endAt', config.endAt?.toString() || Date.now().toString());
  const normalizedPath = path ? normalizePath(path) : undefined;
  // Static hosts may serve either spelling. Exact queries retain both histories without matching child routes.
  const paths = normalizedPath && normalizedPath !== '/' ? [normalizedPath, `${normalizedPath}/`] : [normalizedPath];
  const pageviews = await Promise.all(
    paths.map(async (pagePath) => {
      const requestUrl = new URL(url);
      requestUrl.search = params.toString();
      if (pagePath) requestUrl.searchParams.set('path', pagePath);

      const response = await fetch(requestUrl.toString(), { method: 'GET', headers });
      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(`Umami API error: ${text}`);
      }
      const stats: UmamiSessionStats = await response.json();
      return typeof stats.pageviews === 'number' ? stats.pageviews : stats.pageviews.value;
    }),
  );
  return pageviews.reduce((total, count) => total + count, 0);
}

interface CacheEntry {
  value: number | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<number | null>>();

function getCacheKey(config: UmamiStatsConfig): string {
  return [
    config.baseUrl,
    config.websiteId,
    config.shareToken,
    config.path ? normalizePath(config.path) : '',
    config.startAt ?? 0,
    config.endAt ?? '',
  ].join(':');
}

export function getPageviews(config: UmamiStatsConfig): Promise<number | null> {
  const key = getCacheKey(config);

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);

  const inflight = inflightRequests.get(key);
  if (inflight) return inflight;

  const promise = fetchPageviews(config)
    .then((pv) => {
      cache.set(key, { value: pv, expiresAt: Date.now() + CACHE_TTL });
      return pv;
    })
    .catch((error) => {
      console.error('Failed to fetch Umami pageviews:', error);
      if (import.meta.env?.DEV) {
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

/** Use one cache key for both spellings; stats requests still query each exact path. */
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

import type { UmamiConfig } from '@lib/config/types';
import type { UmamiSessionStats, UmamiStatsConfig } from '@/types/umami-stats';

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
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Umami API error: ${data?.message ?? response.statusText}`);
  }
  return data;
}

const inflightRequests = new Map<string, Promise<number | 'N/A'>>();

export function getPageviews(config: UmamiStatsConfig): Promise<number | 'N/A'> {
  const key = `${config.baseUrl}:${config.websiteId}:${config.path ?? ''}`;
  const inflight = inflightRequests.get(key);
  if (inflight) return inflight;

  const promise = getSessionStats(config)
    .then((stats) => (typeof stats.pageviews === 'number' ? stats.pageviews : stats.pageviews.value))
    .catch((error) => {
      console.error('Failed to fetch Umami pageviews:', error);
      return 'N/A' as const;
    })
    .finally(() => inflightRequests.delete(key));

  inflightRequests.set(key, promise);
  return promise;
}

export function createUmamiStatsConfig(config: UmamiConfig, path?: string): UmamiStatsConfig {
  return {
    baseUrl: config.endpoint,
    websiteId: config.id,
    shareToken: config.statistics_display?.token ?? '',
    path,
  };
}

/**
 * 获取 Umami Session Stats
 * @param UmamiSessionStatsConfig
 * @returns
 */

import type { UmamiConfig } from '@lib/config/types';
import type { UmamiSessionStats, UmamiSessionStatsConfig } from '@/types/umami-stats';

const getSessionStats = async (config: UmamiSessionStatsConfig): Promise<UmamiSessionStats> => {
  const { baseUrl, websiteId, token, loginType = 'classic', path } = config;

  const url = new URL(baseUrl);
  url.pathname = `/api/websites/${websiteId}/stats`;

  const headers = new Headers();
  headers.append('accept', 'application/json');
  if (loginType === 'classic') {
    headers.append('Authorization', `Bearer ${token}`);
  } else if (loginType === 'shared') {
    headers.append('x-umami-share-token', token);
  } else {
    throw new Error('loginType must be classic or shared');
  }

  const params = new URLSearchParams();
  params.append('startAt', config.startAt?.toString() || '0');
  params.append('endAt', config.endAt?.toString() || Date.now().toString());
  path && params.append('path', encodeURI(path));
  url.search = params.toString();

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Error: ${data.data?.error}`);
  }
  return data;
};

const safeGetPageviews = async (config: UmamiSessionStatsConfig): Promise<number | 'N/A'> => {
  try {
    const stats = await getSessionStats(config);
    if (typeof stats.pageviews === 'number') {
      return stats.pageviews;
    } else {
      return stats.pageviews.value;
    }
  } catch (error) {
    console.error('Error fetching Umami Pageviews:', error);
    return 'N/A';
  }
};

const UmamiConfigToSessionStatsConfig = (config: UmamiConfig, path?: string): UmamiSessionStatsConfig => ({
  baseUrl: config.endpoint || '',
  websiteId: config.id || '',
  token: config.statistics_display?.token || '',
  loginType: config.statistics_display?.loginType || 'classic',
  path,
});

export { getSessionStats, safeGetPageviews, UmamiConfigToSessionStatsConfig };

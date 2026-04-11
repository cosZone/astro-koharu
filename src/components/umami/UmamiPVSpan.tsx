import { getPageviews } from '@lib/umami-stats';
import { formatCompactNumber } from '@lib/utils';
import { useEffect, useState } from 'react';
import type { UmamiStatsConfig } from '@/types/umami-stats';

interface Props {
  statsConfig: UmamiStatsConfig;
  compact?: boolean;
}

export default function UmamiPVSpan({ statsConfig, compact = true }: Props) {
  const [pageviews, setPageviews] = useState<number | null | undefined>(undefined);
  const { baseUrl, websiteId, shareToken, path } = statsConfig;

  useEffect(() => {
    let cancelled = false;
    getPageviews({ baseUrl, websiteId, shareToken, path })
      .then((pv) => {
        if (!cancelled) setPageviews(pv);
      })
      .catch(() => {
        if (!cancelled) setPageviews(null);
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl, websiteId, shareToken, path]);

  if (pageviews === undefined) return <span>...</span>;
  if (pageviews === null) return <span>N/A</span>;
  const display = compact ? formatCompactNumber(pageviews) : pageviews.toString();
  return <span title={pageviews.toLocaleString()}>{display}</span>;
}

import { getPageviews } from '@lib/umami-stats';
import { useEffect, useState } from 'react';
import type { UmamiStatsConfig } from '@/types/umami-stats';

interface Props {
  statsConfig: UmamiStatsConfig;
}

export default function UmamiPVSpan({ statsConfig }: Props) {
  const [pageviews, setPageviews] = useState<number | 'N/A' | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPageviews(statsConfig).then((pv) => {
      if (!cancelled) setPageviews(pv);
    });
    return () => {
      cancelled = true;
    };
  }, [statsConfig]);

  if (pageviews === null) return <span>...</span>;
  return <span>{pageviews}</span>;
}

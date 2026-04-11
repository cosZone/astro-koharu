import { getPageviews } from '@lib/umami-stats';
import { useEffect, useState } from 'react';
import type { UmamiStatsConfig } from '@/types/umami-stats';

interface Props {
  statsConfig: UmamiStatsConfig;
}

export default function UmamiPVSpan({ statsConfig }: Props) {
  const [pageviews, setPageviews] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getPageviews(statsConfig).then((pv) => {
      if (!cancelled) setPageviews(pv);
    });
    return () => {
      cancelled = true;
    };
  }, [statsConfig]);

  if (pageviews === undefined) return <span>...</span>;
  if (pageviews === null) return <span>N/A</span>;
  return <span>{pageviews}</span>;
}

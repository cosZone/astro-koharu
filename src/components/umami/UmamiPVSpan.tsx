import { safeGetPageviews } from '@lib/umami-stats';
import { useEffect, useRef } from 'react';
import type { UmamiSessionStatsConfig } from '@/types/umami-stats';

interface Props {
  sessionStatsConfig: UmamiSessionStatsConfig;
  path?: string;
}

export default function UmamiPVSpan({ sessionStatsConfig }: Props) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const fetchPageviews = async () => {
      try {
        const sitePageviews = await safeGetPageviews(sessionStatsConfig);

        if (containerRef.current) {
          containerRef.current.textContent = sitePageviews.toString();
        }
      } catch (error) {
        console.error('Error fetching Umami Pageviews:', error);
      }
    };

    fetchPageviews();
  }, [sessionStatsConfig]); // 确保包含所有依赖

  return <span ref={containerRef}>...</span>;
}

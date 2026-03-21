import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAllCollections } from '@/lib/bangumi/api';
import { SUBJECT_TYPE_KEYS, SUBJECT_TYPE_MAP, type SubjectTypeKey } from '@/lib/bangumi/constants';
import type { BangumiUserCollection } from '@/types/bangumi';

type BangumiData = Record<SubjectTypeKey, BangumiUserCollection[]>;

interface UseBangumiDataReturn {
  data: BangumiData;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

const emptyData: BangumiData = {
  anime: [],
  book: [],
  music: [],
  game: [],
  real: [],
};

export function useBangumiData(userId: string): UseBangumiDataReturn {
  const [data, setData] = useState<BangumiData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const [trigger, setTrigger] = useState(0);

  const retry = useCallback(() => setTrigger((n) => n + 1), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger forces re-fetch on retry
  useEffect(() => {
    cancelledRef.current = false;
    setIsLoading(true);
    setError(null);
    setData(emptyData);

    async function load() {
      try {
        const results = await Promise.all(
          SUBJECT_TYPE_KEYS.map(async (key) => {
            const items = await fetchAllCollections(userId, SUBJECT_TYPE_MAP[key]);
            return [key, items] as const;
          }),
        );

        if (cancelledRef.current) return;

        const newData = { ...emptyData };
        for (const [key, items] of results) {
          newData[key] = items;
        }
        setData(newData);
      } catch (err) {
        if (cancelledRef.current) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelledRef.current) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelledRef.current = true;
    };
  }, [userId, trigger]);

  return { data, isLoading, error, retry };
}

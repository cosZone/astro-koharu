/**
 * usePostList Hook
 *
 * Custom hook for fetching and managing the post list with filters.
 */

import { type ListPostsParams, type ListPostsResponse, listPosts } from '@lib/cms';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePostListResult {
  data: ListPostsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePostList(params?: ListPostsParams): UsePostListResult {
  const [data, setData] = useState<ListPostsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract primitive values to use as stable dependencies
  const { category, tag, status, search, sort, order } = params ?? {};

  // Store params in ref for refetch to access latest values
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // Refetch function that uses ref (stable, no dependencies)
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listPosts(paramsRef.current);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch on mount and when filter params change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally trigger refetch when params change
  useEffect(() => {
    refetch();
  }, [category, tag, status, search, sort, order, refetch]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

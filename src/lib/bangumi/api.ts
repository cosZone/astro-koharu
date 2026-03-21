import type { BangumiCollectionResponse, BangumiSubjectType } from '@/types/bangumi';
import { API_PAGE_SIZE, BANGUMI_API_BASE, MAX_API_PAGES } from './constants';

export async function fetchUserCollections(
  userId: string,
  subjectType: BangumiSubjectType,
  limit = API_PAGE_SIZE,
  offset = 0,
): Promise<BangumiCollectionResponse> {
  const url = new URL(`${BANGUMI_API_BASE}/users/${encodeURIComponent(userId)}/collections`);
  url.searchParams.set('subject_type', String(subjectType));
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Bangumi API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchAllCollections(
  userId: string,
  subjectType: BangumiSubjectType,
): Promise<BangumiCollectionResponse['data']> {
  const first = await fetchUserCollections(userId, subjectType, API_PAGE_SIZE, 0);
  if (first.data.length >= first.total || first.data.length < API_PAGE_SIZE) return first.data;

  // Remaining pages are independent — fetch in parallel
  const remainingPages = Math.min(Math.ceil((first.total - first.data.length) / API_PAGE_SIZE), MAX_API_PAGES - 1);
  const rest = await Promise.all(
    Array.from({ length: remainingPages }, (_, i) =>
      fetchUserCollections(userId, subjectType, API_PAGE_SIZE, (i + 1) * API_PAGE_SIZE).then((r) => r.data),
    ),
  );

  return [...first.data, ...rest.flat()];
}

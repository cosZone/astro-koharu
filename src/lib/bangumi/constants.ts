import type { BangumiCollectionType, BangumiSubjectType } from '@/types/bangumi';

export const BANGUMI_API_BASE = 'https://api.bgm.tv/v0';

export const ITEMS_PER_PAGE = 12;
export const API_PAGE_SIZE = 50;
export const MAX_API_PAGES = 20;

export type SubjectTypeKey = 'anime' | 'book' | 'music' | 'game' | 'real';

export const SUBJECT_TYPE_MAP: Record<SubjectTypeKey, BangumiSubjectType> = {
  book: 1,
  anime: 2,
  music: 3,
  game: 4,
  real: 6,
};

export const SUBJECT_TYPE_KEYS: SubjectTypeKey[] = ['anime', 'book', 'music', 'game', 'real'];

export const COLLECTION_STATUS_COLORS: Record<BangumiCollectionType, string> = {
  1: 'bg-blue-500',
  2: 'bg-green-500',
  3: 'bg-yellow-500',
  4: 'bg-orange-500',
  5: 'bg-red-500',
};

// Bangumi API v0 type definitions
// API docs: https://bangumi.github.io/api/

/** 1=Book, 2=Anime, 3=Music, 4=Game, 6=Real */
export type BangumiSubjectType = 1 | 2 | 3 | 4 | 6;

/** 1=Wish, 2=Collected, 3=Watching, 4=OnHold, 5=Dropped */
export type BangumiCollectionType = 1 | 2 | 3 | 4 | 5;

export interface BangumiSubjectImages {
  large: string;
  common: string;
  medium: string;
  small: string;
  grid: string;
}

export interface BangumiSubjectTag {
  name: string;
  count: number;
}

export interface BangumiSlimSubject {
  id: number;
  type: BangumiSubjectType;
  name: string;
  name_cn: string;
  date?: string | null;
  images?: BangumiSubjectImages | null;
  score: number;
  tags?: BangumiSubjectTag[];
}

export interface BangumiUserCollection {
  subject_id: number;
  subject_type: BangumiSubjectType;
  rate: number;
  type: BangumiCollectionType;
  tags: string[];
  ep_status: number;
  vol_status: number;
  updated_at: string;
  subject: BangumiSlimSubject;
}

export interface BangumiCollectionResponse {
  data: BangumiUserCollection[];
  total: number;
  limit: number;
  offset: number;
}

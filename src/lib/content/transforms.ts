/**
 * Data transformation utilities for BlogPost
 * Converts heavy BlogPost objects to lightweight interfaces for component props
 *
 * Uses a flexible pick-based API that allows selecting specific fields on demand
 */

import readingTime from 'reading-time';
import { defaultLocale } from '@/i18n/config';
import type { BlogPost } from '@/types/blog';
import { getPostLocale, getSlugLocaleInfo } from './locale';
import { getPostDescriptionWithSummary, getPostLastCategory } from './posts';

/**
 * BlogPost 可提取的字段映射
 * - 直接字段：从 post.slug 或 post.data.xxx 直接取
 * - 计算字段：需要调用函数计算
 */
export type PostFieldMap = {
  // 直接字段
  slug: string;
  link: string | undefined;
  title: string;
  date: Date;
  cover: string | undefined;
  tags: string[] | undefined;
  categories: string[] | string[][] | undefined;
  draft: boolean | undefined;
  // 计算字段
  categoryName: string | undefined; // from getPostLastCategory()
  description: string; // from getPostDescriptionWithSummary()
  wordCount: number; // from reading-time
  readingTime: string; // from reading-time
  postLocale: string; // from getPostLocale()
};

/**
 * 字段提取器映射
 * 每个字段对应一个从 BlogPost 提取值的函数
 */
const fieldExtractors: { [K in keyof PostFieldMap]: (post: BlogPost, locale: string) => PostFieldMap[K] } = {
  // 直接字段
  slug: (p) => getSlugLocaleInfo(p.slug).localeFreeSlug,
  link: (p) => p.data?.link,
  title: (p) => p.data.title,
  date: (p) => p.data.date,
  cover: (p) => p.data?.cover,
  tags: (p) => p.data?.tags,
  categories: (p) => p.data?.categories,
  draft: (p) => p.data?.draft,
  // 计算字段
  categoryName: (p) => getPostLastCategory(p).name || undefined,
  description: (p, locale) => getPostDescriptionWithSummary(p, locale),
  wordCount: (p) => readingTime(p.body ?? '').words,
  readingTime: (p) => readingTime(p.body ?? '').text,
  postLocale: (p) => getPostLocale(p),
};

/**
 * 从 BlogPost 中选取指定字段
 * @example pickPost(post, ['slug', 'link', 'title'])
 * @example pickPost(post, ['slug', 'link', 'title', 'categoryName'])
 */
export function pickPost<K extends keyof PostFieldMap>(
  post: BlogPost,
  keys: readonly K[],
  locale: string = defaultLocale,
): Pick<PostFieldMap, K> {
  const result = {} as Pick<PostFieldMap, K>;
  for (const key of keys) {
    result[key] = fieldExtractors[key](post, locale);
  }
  return result;
}

/**
 * 批量从 BlogPost 数组中选取指定字段
 * @example pickPosts(posts, ['slug', 'link', 'title'])
 * @example pickPosts(posts, ['slug', 'link', 'title', 'categoryName'])
 */
export function pickPosts<K extends keyof PostFieldMap>(
  posts: BlogPost[],
  keys: readonly K[],
  locale: string = defaultLocale,
): Pick<PostFieldMap, K>[] {
  return posts.map((post) => pickPost(post, keys, locale));
}

// 便捷别名 - 保持向后兼容

/** PostRef 需要的字段 */
const POST_REF_KEYS = ['slug', 'link', 'title'] as const;

/** PostRefWithCategory 需要的字段 */
const POST_REF_WITH_CATEGORY_KEYS = ['slug', 'link', 'title', 'categoryName'] as const;

/** PostCardData 需要的字段 */
const POST_CARD_DATA_KEYS = [
  'slug',
  'link',
  'title',
  'description',
  'date',
  'cover',
  'tags',
  'categories',
  'draft',
  'wordCount',
  'readingTime',
  'postLocale',
] as const;

/**
 * 转换为最小引用 (3 字段: slug, link, title)
 */
export const toPostRef = (post: BlogPost) => pickPost(post, POST_REF_KEYS);

/**
 * 转换为带分类引用 (4 字段: slug, link, title, categoryName)
 */
export const toPostRefWithCategory = (post: BlogPost) => pickPost(post, POST_REF_WITH_CATEGORY_KEYS);

/**
 * 转换为卡片数据（卡片展示所需字段）
 */
export const toPostCardData = (post: BlogPost, locale: string = defaultLocale) => pickPost(post, POST_CARD_DATA_KEYS, locale);

// 批量转换便捷函数
export const toPostRefs = (posts: BlogPost[]) => pickPosts(posts, POST_REF_KEYS);
export const toPostRefsWithCategory = (posts: BlogPost[]) => pickPosts(posts, POST_REF_WITH_CATEGORY_KEYS);
export const toPostCardDataList = (posts: BlogPost[], locale: string = defaultLocale) =>
  pickPosts(posts, POST_CARD_DATA_KEYS, locale);

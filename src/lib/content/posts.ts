/**
 * Post-related utility functions
 */

import { type CollectionEntry, getCollection } from 'astro:content';
import summaries from '@assets/summaries.json';
import { siteConfig } from '@constants/site-config';
import type { FeaturedSeriesItem } from '@lib/config/types';
import readingTime from 'reading-time';
import type { BlogPost } from 'types/blog';
import { t } from '@/i18n';
import { defaultLocale } from '@/i18n/config';
import { extractTextFromMarkdown } from '../sanitize';
import { memoize } from './cache';
import { buildCategoryPath } from './category-path';
import { filterPostsByLocale, getPostSlug } from './locale';

/** WeakMap-based cache for reading-time results — auto-GC when post objects are collected */
const readingTimeCache = new WeakMap<CollectionEntry<'blog'>, { words: number; text: string; minutes: number }>();

/**
 * Get reading-time stats for a post, cached per object identity.
 * Ensures each post's body is parsed at most once across transforms, Cover, and stats.
 */
export function getPostReadingTime(post: CollectionEntry<'blog'>): { words: number; text: string; minutes: number } {
  let cached = readingTimeCache.get(post);
  if (!cached) {
    const result = readingTime(post.body ?? '');
    cached = { words: result.words, text: result.text, minutes: result.minutes };
    readingTimeCache.set(post, cached);
  }
  return cached;
}

/** AI 摘要数据类型 */
type SummariesData = Record<string, { title: string; summary: string }>;

/** Pre-built lowercase slug → original key map for O(1) case-insensitive fallback */
const summaryLowerMap = new Map<string, string>();
for (const key of Object.keys(summaries as SummariesData)) {
  summaryLowerMap.set(key.toLowerCase(), key);
}

/**
 * 获取文章描述
 * 优先使用 frontmatter 中的 description，如果不存在则从 Markdown 内容中智能提取
 * @param post 文章对象
 * @param maxLength 最大长度，默认 150 字符
 * @returns 文章描述文本
 */
export function getPostDescription(post: BlogPost, locale: string = defaultLocale, maxLength: number = 150): string {
  if (post.data.description) return post.data.description;
  if (post.data.password) return t(locale, 'encrypted.post.description');
  return extractTextFromMarkdown(post.body, maxLength);
}

/**
 * 获取文章的 AI 摘要
 * @param slug 文章 slug（通常是 post.data.link 或 post.slug）
 * @returns AI 摘要文本，如果不存在则返回 null
 */
export function getPostSummary(slug: string): string | null {
  const data = summaries as SummariesData;

  // Fast path: exact match (O(1))
  const exactMatch = data[slug]?.summary ?? null;
  if (exactMatch) return exactMatch;

  // Fallback: case-insensitive lookup via pre-built map
  const originalKey = summaryLowerMap.get(slug.toLowerCase());
  return originalKey ? data[originalKey].summary : null;
}

/**
 * 获取文章描述，带 AI 摘要 fallback
 * 优先级：frontmatter description > 加密文章通用描述 > AI 摘要 > markdown 提取
 * @param post 文章对象
 * @param locale 语言环境
 * @param maxLength 最大长度，默认 150 字符
 * @returns 文章描述文本
 */
export function getPostDescriptionWithSummary(post: BlogPost, locale: string = defaultLocale, maxLength: number = 150): string {
  // 最高优先级：frontmatter 中的描述
  if (post.data.description) {
    return post.data.description;
  }
  if (post.data.password) {
    return t(locale, 'encrypted.post.description');
  }
  return getPostSummary(getPostSlug(post)) || extractTextFromMarkdown(post.body, maxLength);
}

/**
 * Get all posts sorted by date (newest first)
 * In production, draft posts are filtered out
 * @param locale Optional locale filter — undefined returns all, 'zh' returns default only, 'en' returns en + fallback
 */
export async function getSortedPosts(locale?: string): Promise<CollectionEntry<'blog'>[]> {
  return memoize('sortedPosts', locale ?? '__all__', async () => {
    const posts = await getCollection('blog', ({ data }) => {
      // 在生产环境中，过滤掉草稿
      return import.meta.env.PROD ? data.draft !== true : true;
    });

    // 使用浅拷贝避免原地修改 Astro 内部缓存的数组
    const sortedPosts = posts.toSorted((a: BlogPost, b: BlogPost) => {
      return b.data.date.getTime() - a.data.date.getTime();
    });

    return filterPostsByLocale(sortedPosts, locale);
  });
}

/**
 * Get a single post by its collection ID.
 * Builds an id→post Map once (per locale), then lookups are O(1).
 */
export async function getPostById(id: string, locale?: string): Promise<CollectionEntry<'blog'> | undefined> {
  const map = await memoize('postByIdMap', locale ?? '__all__', async () => {
    const posts = await getSortedPosts(locale);
    return new Map(posts.map((p) => [p.id, p]));
  });
  return map.get(id);
}

/**
 * Get post count (excluding drafts in production)
 * Leverages getSortedPosts cache instead of a separate getCollection call.
 */
export async function getPostCount(locale?: string) {
  const posts = await getSortedPosts(locale);
  return posts.length;
}

/**
 * 获取分类下的所有文章
 * @param categoryName 分类名
 * @returns 文章列表
 */
export async function getPostsByCategory(categoryName: string, locale?: string): Promise<BlogPost[]> {
  return memoize('postsByCat', `${categoryName}:${locale ?? '__all__'}`, async () => {
    const posts = await getSortedPosts(locale);
    return posts.filter((post) => {
      const { categories } = post.data;
      if (!categories?.length) return false;

      const firstCategory = categories[0];
      // 处理两种分类格式
      if (Array.isArray(firstCategory)) {
        // ['笔记', '算法']
        return firstCategory.includes(categoryName);
      } else if (typeof firstCategory === 'string') {
        // '工具'
        return firstCategory === categoryName;
      }
      return false;
    });
  });
}

/**
 * Get the last (deepest) category of a post
 */
export function getPostLastCategory(post: BlogPost): { link: string; name: string } {
  const { categories } = post.data;
  if (!categories?.length) return { link: '', name: '' };

  const firstCategory = categories[0];
  if (Array.isArray(firstCategory)) {
    if (!firstCategory.length) return { link: '', name: '' };
    return {
      link: buildCategoryPath(firstCategory),
      name: firstCategory[firstCategory.length - 1],
    };
  } else if (typeof firstCategory === 'string') {
    return {
      link: buildCategoryPath(firstCategory),
      name: firstCategory,
    };
  }

  return { link: '', name: '' };
}

/**
 * 获取文章所属系列的所有文章（基于最深层分类）
 * @param post 当前文章
 * @param locale 可选 locale 过滤
 * @returns 系列文章列表（按日期排序，最新的在前）
 */
export async function getSeriesPosts(post: BlogPost, locale?: string): Promise<BlogPost[]> {
  const lastCategory = getPostLastCategory(post);
  if (!lastCategory.name) return [];

  return await getPostsByCategory(lastCategory.name, locale);
}

/**
 * 获取文章的上一篇和下一篇（在同一系列中）
 * @param currentPost 当前文章
 * @param locale 可选 locale 过滤
 * @returns 上一篇和下一篇文章
 */
export async function getAdjacentSeriesPosts(
  currentPost: BlogPost,
  locale?: string,
): Promise<{
  prevPost: BlogPost | null;
  nextPost: BlogPost | null;
}> {
  const seriesPosts = await getSeriesPosts(currentPost, locale);

  if (seriesPosts.length === 0) {
    return { prevPost: null, nextPost: null };
  }

  const currentSlug = getPostSlug(currentPost);
  const currentIndex = seriesPosts.findIndex((post) => getPostSlug(post) === currentSlug);

  if (currentIndex === -1) {
    return { prevPost: null, nextPost: null };
  }

  // 因为文章是按日期降序排列的（最新的在前）
  // prevPost 是更新的文章（索引 - 1）
  // nextPost 是更旧的文章（索引 + 1）
  const prevPost = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : null;

  return { prevPost, nextPost };
}

/**
 * 检查文章是否属于特定分类
 * @param post 文章
 * @param categoryName 分类名
 * @returns 是否属于该分类
 */
function isPostInCategory(post: BlogPost, categoryName: string): boolean {
  const { categories } = post.data;
  if (!categories?.length) return false;

  const firstCategory = categories[0];
  if (Array.isArray(firstCategory)) {
    return firstCategory.includes(categoryName);
  } else if (typeof firstCategory === 'string') {
    return firstCategory === categoryName;
  }
  return false;
}

// =============================================================================
// Featured Series Functions
// =============================================================================

/**
 * 获取所有启用的 Featured Series
 * @returns 启用的系列列表
 */
export function getEnabledSeries(): FeaturedSeriesItem[] {
  return siteConfig.featuredSeries.filter((series) => series.enabled !== false);
}

/**
 * 获取所有 Featured Series 的分类名
 * @returns 分类名列表
 */
export function getFeaturedCategoryNames(): string[] {
  return getEnabledSeries().map((series) => series.categoryName);
}

/**
 * 获取所有非 Featured Series 的文章（已排序）
 * @returns 非系列文章列表（按日期排序，最新的在前）
 */
export async function getNonFeaturedPosts(locale?: string): Promise<BlogPost[]> {
  const categoryNames = getFeaturedCategoryNames();
  if (categoryNames.length === 0) {
    return await getSortedPosts(locale);
  }

  const allPosts = await getSortedPosts(locale);
  return allPosts.filter((post) => !categoryNames.some((catName) => isPostInCategory(post, catName)));
}

/**
 * 优化的首页数据获取 - 单次遍历获取所有需要的数据
 * @returns 包含高亮文章、置顶文章和普通文章的对象
 */
export async function getHomePagePosts(locale?: string): Promise<{
  highlightedPosts: BlogPost[];
  stickyPosts: BlogPost[];
  regularPosts: BlogPost[];
}> {
  const allPosts = await getSortedPosts(locale);
  const highlightedSeries = getEnabledSeries().filter((series) => series.highlightOnHome !== false);
  const categoryNames = getFeaturedCategoryNames();

  // 用于追踪每个高亮系列的最新文章
  const seriesLatestMap = new Map<string, BlogPost>();

  const stickyPosts: BlogPost[] = [];
  const regularPosts: BlogPost[] = [];

  // 单次遍历所有文章
  for (const post of allPosts) {
    // 检查是否属于任何 featured 系列
    const isFeatured = categoryNames.some((catName) => isPostInCategory(post, catName));

    if (isFeatured) {
      // 检查是否属于高亮系列，并记录最新文章
      for (const series of highlightedSeries) {
        if (isPostInCategory(post, series.categoryName)) {
          if (!seriesLatestMap.has(series.categoryName)) {
            seriesLatestMap.set(series.categoryName, post);
          }
          break;
        }
      }
      // 跳过所有 featured 系列文章，不加入普通列表
      continue;
    }

    if (post.data?.sticky) {
      stickyPosts.push(post);
    } else {
      regularPosts.push(post);
    }
  }

  // 提取高亮文章（保持系列定义的顺序）
  const highlightedPosts: BlogPost[] = [];
  for (const series of highlightedSeries) {
    const post = seriesLatestMap.get(series.categoryName);
    if (post) {
      highlightedPosts.push(post);
    }
  }

  return { highlightedPosts, stickyPosts, regularPosts };
}

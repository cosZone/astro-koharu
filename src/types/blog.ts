import type { CollectionEntry } from 'astro:content';

/**
 * Blog post schema - matches the schema defined in content/config.ts
 */
export interface BlogSchema {
  title: string;
  description?: string;
  link?: string;
  date: Date;
  updated?: Date;
  cover?: string;
  tags?: string[];
  subtitle?: string;
  catalog?: boolean;
  categories?: string[] | string[][];
  sticky?: boolean;
  draft?: boolean;
  tocNumbering?: boolean;
  /** Exclude this post from AI summary generation */
  excludeFromSummary?: boolean;
}

/**
 * Blog post type from Astro content collections
 */
export type BlogPost = CollectionEntry<'blog'>;

/**
 * 最小文章引用 - 用于导航（3 字段）
 */
export interface PostRef {
  slug: string;
  link?: string;
  title: string;
}

/**
 * 带分类的文章引用 - 用于列表展示（4 字段）
 */
export interface PostRefWithCategory extends PostRef {
  categoryName?: string;
}

/**
 * 文章卡片数据 - 用于卡片展示
 */
export interface PostCardData {
  slug: string;
  link?: string;
  title: string;
  description?: string;
  date: Date;
  cover?: string;
  tags?: string[];
  categories?: string[] | string[][];
  draft?: boolean;
  wordCount: number; // 预计算的字数
  readingTime: string; // 预计算的阅读时间
}

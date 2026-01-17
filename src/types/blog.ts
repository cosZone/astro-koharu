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

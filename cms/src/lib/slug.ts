/**
 * Slug Generation Utility
 *
 * Generates URL-friendly slugs from titles containing mixed languages.
 * Converts Chinese/Japanese characters to pinyin/romaji via transliteration.
 */

import { slugify } from 'transliteration';

/**
 * Generate a URL-friendly slug from a title.
 * Converts CJK characters to romanized form, keeps ASCII characters grouped.
 *
 * @example
 * generateSlug('test123')           // 'test123'
 * generateSlug('Hello World')       // 'hello-world'
 * generateSlug('你好')              // 'ni-hao'
 * generateSlug('React学习笔记')     // 'react-xue-xi-bi-ji'
 */
export function generateSlug(title: string): string {
  return slugify(title, { separator: '-' });
}

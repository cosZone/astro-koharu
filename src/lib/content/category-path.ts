/**
 * Pure category path/array utilities — no dependency on posts.ts.
 * Extracted to break the circular dependency: posts → categories → posts.
 */

import { categoryMap } from '@constants/category';
import { encodeSlug } from '../route';

/**
 * Build category path from category names
 * @param categoryNames Array of category names or single category name
 * @returns Category path like "/categories/note/front-end"
 */
export function buildCategoryPath(categoryNames: string | string[]): string {
  if (!categoryNames) return '';

  const names = Array.isArray(categoryNames) ? categoryNames : [categoryNames];
  if (names.length === 0) return '';

  const slugs = names.map((name) => encodeSlug(categoryMap[name]));
  return `/categories/${slugs.join('/')}`;
}

/**
 * 统一 ['分类1', '分类2'] 和 '分类'
 */
export function getCategoryArr(categories?: string[] | string) {
  if (!categories) return [];
  if (Array.isArray(categories) && categories.length) {
    return categories as string[];
  } else return [categories as string];
}

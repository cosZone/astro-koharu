/**
 * CMS Category Utilities
 *
 * Utilities for detecting new categories and generating URL-friendly slugs.
 * Used by the CMS editor to auto-create category mappings.
 */

import { categoryMap } from '@constants/category';
import { pinyin } from 'pinyin-pro';

/**
 * Generates a URL-friendly slug from a category name (typically Chinese).
 * Uses pinyin conversion for Chinese characters.
 *
 * @example
 * generateCategorySlug('算法') // 'suan-fa'
 * generateCategorySlug('前端') // 'qian-duan'
 */
export function generateCategorySlug(name: string): string {
  const pinyinStr = pinyin(name, { toneType: 'none', type: 'array' }).join('-');
  return pinyinStr.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/**
 * Extracts all category names from frontmatter categories.
 * Handles both flat arrays ['A', 'B'] and nested arrays [['A', 'B'], 'C'].
 */
export function extractCategoryNames(categories?: string | string[] | string[][]): string[] {
  if (!categories) return [];

  // Handle single string
  if (typeof categories === 'string') {
    return [categories];
  }

  const names: string[] = [];
  for (const cat of categories) {
    if (Array.isArray(cat)) {
      names.push(...cat);
    } else {
      names.push(cat);
    }
  }
  return [...new Set(names)];
}

/**
 * Detects categories that don't exist in categoryMap and generates suggested slugs.
 *
 * @returns A record of { categoryName: suggestedSlug } for new categories
 *
 * @example
 * detectNewCategories(['算法', '笔记'])
 * // If '算法' is new and '笔记' exists:
 * // { '算法': 'suan-fa' }
 */
export function detectNewCategories(categories?: string | string[] | string[][]): Record<string, string> {
  const names = extractCategoryNames(categories);
  const newMappings: Record<string, string> = {};

  for (const name of names) {
    if (!categoryMap[name]) {
      newMappings[name] = generateCategorySlug(name);
    }
  }

  return newMappings;
}

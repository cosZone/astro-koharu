/**
 * CMS Category Utilities
 *
 * Utilities for detecting new categories and generating URL-friendly slugs.
 * Used by the CMS editor to auto-create category mappings.
 */

import { generateSlug } from './slug';

// Category map will be loaded at runtime from config
let categoryMap: Record<string, string> = {};

/**
 * Set the category map from config
 */
export function setCategoryMap(map: Record<string, string>) {
  categoryMap = map;
}

/**
 * Get the current category map
 */
export function getCategoryMap(): Record<string, string> {
  return categoryMap;
}

/**
 * Generates a URL-friendly slug from a category name.
 * Delegates to the shared generateSlug utility.
 *
 * @example
 * generateCategorySlug('算法') // 'suan-fa'
 * generateCategorySlug('前端') // 'qian-duan'
 * generateCategorySlug('React') // 'react'
 */
export function generateCategorySlug(name: string): string {
  return generateSlug(name);
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

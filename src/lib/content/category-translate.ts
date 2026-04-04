import { categoryMap } from '@constants/category';
import { getContentCategoryName } from '@/i18n/content';
import type { Locale } from '@/i18n/types';

/**
 * Translate a category name based on locale.
 * Looks up the YAML content config (config/i18n-content.yaml), falls back to original name.
 */
export function translateCategoryName(name: string, locale: Locale): string {
  const slug = categoryMap[name];
  if (!slug || !locale) return name;
  return getContentCategoryName(locale, slug) ?? name;
}

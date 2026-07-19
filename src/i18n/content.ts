/**
 * i18n Content Translation Loader
 *
 * Loads content-level translations (category names, series fields, featured category fields)
 * from config/i18n-content.yaml. These are user-configurable strings separate from UI strings.
 *
 * Lookup: YAML content config → caller provides fallback
 */

import i18nContent from '../../config/i18n-content.yaml';
import type { I18nContentConfig } from './content-types';

const config = i18nContent as I18nContentConfig;

/**
 * Look up a translated category name from the YAML content config.
 * Returns undefined if no translation is defined for the given locale/slug.
 */
export function getContentCategoryName(locale: string, slug: string): string | undefined {
  return config[locale]?.categories?.[slug];
}

/**
 * Look up a translated series field (label, fullName, description) from the YAML content config.
 * Returns undefined if no translation is defined.
 */
export function getContentSeriesField(locale: string, slug: string, field: string): string | undefined {
  const series = config[locale]?.series?.[slug];
  if (!series) return undefined;
  return series[field as keyof typeof series];
}

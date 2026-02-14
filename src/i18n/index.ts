/**
 * i18n Module — Public API
 *
 * This barrel export defines the public interface of the i18n system.
 * Import from '@/i18n' for all internationalization needs.
 */

// Config
export {
  allKnownLocales,
  defaultLocale,
  getLocaleLabel,
  isI18nEnabled,
  isLocaleSupported,
  localeEntries,
  localeList,
} from './config';
// Content translations (YAML-based)
export { getContentCategoryName, getContentFeaturedCategoryField, getContentSeriesField } from './content';
export type {
  FeaturedCategoryContentTranslation,
  I18nContentConfig,
  LocaleContentTranslations,
  SeriesContentTranslation,
} from './content-types';
// Types
export type { DefaultUIStrings, Locale, TranslationKey, TranslationParams, UIStrings } from './types';
// Utilities
export {
  createTranslator,
  getAlternateUrl,
  getHtmlLang,
  getLocaleFromUrl,
  localizedPath,
  resolveNavName,
  stripLocaleFromPath,
  t,
  tryTranslate,
} from './utils';

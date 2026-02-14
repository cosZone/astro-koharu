/**
 * i18n Module — Public API
 *
 * This barrel export defines the public interface of the i18n system.
 * Import from '@/i18n' for all internationalization needs.
 *
 * Internal-only symbols (e.g., allKnownLocales, isLocaleSupported,
 * getContent*Name helpers, tryTranslate) are intentionally NOT exported here.
 * They are consumed via direct module imports (e.g., '@/i18n/config').
 */

// Config
export { defaultLocale, getLocaleLabel, isI18nEnabled, localeEntries, localeList } from './config';
// Content translations (YAML-based) — only the config type needed by yaml.d.ts
export type { I18nContentConfig } from './content-types';
// Types — only externally consumed types
export type { Locale, TranslationKey, TranslationParams } from './types';
// Utilities
export {
  getAlternateUrl,
  getHtmlLang,
  getLocaleFromUrl,
  localizedPath,
  resolveNavName,
  stripLocaleFromPath,
  t,
} from './utils';

/**
 * i18n Module — Public API
 *
 * This barrel export defines the public interface of the i18n system.
 * Import from '@/i18n' for all internationalization needs.
 */

// Config
export { buildFallbackMap, defaultLocale, getLocaleLabel, isLocaleSupported, localeEntries, localeList } from './config';
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

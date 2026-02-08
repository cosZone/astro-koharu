/**
 * i18n Type Definitions
 *
 * Core types for the internationalization system.
 * Locale codes follow BCP 47 short format (e.g., 'zh', 'en', 'ja').
 */

import type { uiStrings as zhStrings } from './translations/zh';

/**
 * Supported locale code (derived from site.yaml i18n.locales).
 *
 * This is a semantic alias for `string` — locale codes are dynamic (configured
 * in YAML), so a literal union is not practical. Use `isLocaleSupported()` as
 * a runtime guard to narrow unknown strings into valid locales.
 */
export type Locale = string;

/**
 * Translation key — all valid keys from the default (zh) dictionary.
 * Using `keyof typeof zhStrings` ensures type safety: any key used in `t()`
 * must exist in the default translation file.
 */
export type TranslationKey = keyof typeof zhStrings;

/**
 * UI string dictionary type.
 * All locales must provide a subset (or full set) of the default locale's keys.
 */
export type UIStrings = Partial<Record<TranslationKey, string>>;

/**
 * Complete UI string dictionary (default locale must have all keys).
 */
export type DefaultUIStrings = Record<TranslationKey, string>;

/**
 * Parameters for interpolation in translation strings.
 * Example: t('post.totalPosts', { count: '5' }) replaces {count} in the string.
 */
export type TranslationParams = Record<string, string | number>;

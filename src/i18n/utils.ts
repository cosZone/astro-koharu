/**
 * i18n Utility Functions
 *
 * Core helpers for translation and locale-aware URL handling.
 * Designed as pure functions for testability and SSR compatibility.
 */

import { defaultLocale, isLocaleSupported } from './config';
import { translations } from './translations';
import { uiStrings as defaultStrings } from './translations/zh';
import type { Locale, TranslationKey, TranslationParams } from './types';

/** Replace `{param}` placeholders in a string with provided values. */
function interpolate(value: string, params?: TranslationParams): string {
  if (!params) return value;
  let result = value;
  for (const [param, val] of Object.entries(params)) {
    result = result.replaceAll(`{${param}}`, String(val));
  }
  return result;
}

/**
 * Translate a key to the given locale with optional parameter interpolation.
 *
 * Lookup order:
 * 1. Target locale dictionary
 * 2. Default locale dictionary (fallback)
 *
 * Interpolation replaces `{param}` placeholders with provided values.
 *
 * @example
 * ```ts
 * t('zh', 'post.totalPosts', { count: 5 })
 * // => '共 5 篇文章'
 *
 * t('en', 'post.totalPosts', { count: 5 })
 * // => '5 posts'
 * ```
 */
export function t(locale: Locale, key: TranslationKey, params?: TranslationParams): string {
  const dict = translations[locale];
  const value = dict?.[key] ?? defaultStrings[key];

  if (!value) {
    // Development warning for missing keys
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing translation key: "${key}" for locale "${locale}"`);
    }
    return key;
  }

  return interpolate(value, params);
}

/**
 * Try to translate a dynamic key that may or may not exist in the dictionary.
 * Unlike `t()`, accepts an arbitrary string key and returns `undefined` if not found.
 * This avoids `as TranslationKey` casts for dynamically constructed keys.
 */
function tryTranslate(locale: Locale, key: string, params?: TranslationParams): string | undefined {
  const dict = translations[locale];
  const value = dict?.[key as TranslationKey] ?? defaultStrings[key as TranslationKey];

  if (!value) return undefined;

  return interpolate(value, params);
}

/**
 * Extract locale from a URL pathname.
 *
 * Strategy: check if the first path segment is a supported locale code.
 * If not (or for default locale URLs without prefix), return defaultLocale.
 *
 * Note: URLs with the default locale prefix (e.g., '/zh/post/hello') are treated
 * as defaultLocale — the prefix is ignored. This works with Astro's
 * `redirectToDefaultLocale: true` which redirects `/zh/` → `/`. No static pages
 * are generated for the default locale prefix, so such URLs would 404 anyway.
 *
 * @example
 * ```ts
 * getLocaleFromUrl('/en/post/hello')  // => 'en'
 * getLocaleFromUrl('/post/hello')     // => 'zh' (default)
 * getLocaleFromUrl('/en/')            // => 'en'
 * getLocaleFromUrl('/')               // => 'zh' (default)
 * getLocaleFromUrl('/zh/post/hello')  // => 'zh' (default — prefix ignored)
 * ```
 */
export function getLocaleFromUrl(pathname: string): Locale {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && firstSegment !== defaultLocale && isLocaleSupported(firstSegment)) {
    return firstSegment;
  }

  return defaultLocale;
}

/**
 * Generate a locale-aware path.
 *
 * - Default locale: no prefix (e.g., '/post/hello')
 * - Other locales: prefixed (e.g., '/en/post/hello')
 *
 * @example
 * ```ts
 * localizedPath('/post/hello', 'zh')  // => '/post/hello'
 * localizedPath('/post/hello', 'en')  // => '/en/post/hello'
 * localizedPath('/', 'en')            // => '/en'
 * ```
 */
export function localizedPath(path: string, locale: Locale = defaultLocale): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (locale === defaultLocale) {
    return normalizedPath;
  }

  return `/${locale}${normalizedPath}`;
}

/**
 * Strip the locale prefix from a pathname, returning the locale-free path.
 *
 * @example
 * ```ts
 * stripLocaleFromPath('/en/post/hello')  // => '/post/hello'
 * stripLocaleFromPath('/post/hello')     // => '/post/hello'
 * stripLocaleFromPath('/en')             // => '/'
 * ```
 */
export function stripLocaleFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && firstSegment !== defaultLocale && isLocaleSupported(firstSegment)) {
    const rest = segments.slice(1).join('/');
    return rest ? `/${rest}` : '/';
  }

  return pathname;
}

/**
 * Get the alternate URL for switching to a different locale.
 * Strips the current locale prefix and applies the target locale prefix.
 *
 * @example
 * ```ts
 * getAlternateUrl('/en/post/hello', 'zh')  // => '/post/hello'
 * getAlternateUrl('/post/hello', 'en')     // => '/en/post/hello'
 * ```
 */
export function getAlternateUrl(currentPathname: string, targetLocale: Locale): string {
  const stripped = stripLocaleFromPath(currentPathname);
  return localizedPath(stripped, targetLocale);
}

/**
 * Map short locale codes to BCP 47 language tags for the HTML `lang` attribute.
 *
 * Short codes like `zh` are valid BCP 47 but less specific. This mapping
 * provides region-specific tags for better SEO and accessibility.
 *
 * @example
 * ```ts
 * getHtmlLang('zh')  // => 'zh-CN'
 * getHtmlLang('en')  // => 'en'
 * getHtmlLang('ja')  // => 'ja'
 * ```
 */
const HTML_LANG_MAP: Record<string, string> = {
  zh: 'zh-CN',
};

export function getHtmlLang(locale: Locale): string {
  return HTML_LANG_MAP[locale] ?? locale;
}

/**
 * Resolve a navigation item's display name using its `nameKey` (translation key)
 * with fallback to the raw `name` string.
 *
 * Used by Navigator, DropdownNav, and HomeInfo to render locale-aware nav labels.
 *
 * @example
 * ```ts
 * resolveNavName('nav.home', '首页', 'en')  // => 'Home'
 * resolveNavName(undefined, '首页', 'en')   // => '首页'
 * ```
 */
export function resolveNavName(nameKey: string | undefined, fallbackName: string | undefined, locale: Locale): string {
  if (nameKey) {
    return tryTranslate(locale, nameKey) ?? fallbackName ?? '';
  }
  return fallbackName ?? '';
}

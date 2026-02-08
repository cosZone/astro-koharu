/**
 * i18n Configuration
 *
 * Reads i18n settings from site-config (single source of truth for YAML parsing)
 * and exports typed locale information for use throughout the app.
 */

import { i18nConfig } from '@constants/site-config';

/** Default locale code (e.g., 'zh') */
export const defaultLocale: string = i18nConfig.defaultLocale;

/** All configured locale entries with code and label */
export const localeEntries: { code: string; label: string }[] = i18nConfig.locales.map((l) => ({
  code: l.code,
  label: l.label ?? l.code,
}));

/** All supported locale codes as a set for O(1) lookup */
export const supportedLocales = new Set(localeEntries.map((l) => l.code));

/** All supported locale codes as an array */
export const localeList: string[] = localeEntries.map((l) => l.code);

/**
 * Check if a locale code is supported
 */
export function isLocaleSupported(code: string): boolean {
  return supportedLocales.has(code);
}

/**
 * Get the label for a locale code
 * @returns The label if found, otherwise the code itself
 */
export function getLocaleLabel(code: string): string {
  return localeEntries.find((l) => l.code === code)?.label ?? code;
}

/**
 * Build Astro i18n fallback map.
 * Maps every non-default locale to the default locale.
 * Example: { en: 'zh', ja: 'zh' }
 */
export function buildFallbackMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const code of localeList) {
    if (code !== defaultLocale) {
      map[code] = defaultLocale;
    }
  }
  return map;
}

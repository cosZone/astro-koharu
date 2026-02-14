/**
 * i18n Configuration
 *
 * Reads i18n settings from site-config (single source of truth for YAML parsing)
 * and exports typed locale information for use throughout the app.
 *
 * Two locale sets are maintained:
 * - `allKnownLocales`: All configured locale codes (including disabled) — for slug prefix detection
 * - `supportedLocales` / `localeList`: Only enabled locales — for routing, UI, hreflang
 */

import { i18nConfig } from '@constants/site-config';

/** Default locale code (e.g., 'zh') */
export const defaultLocale: string = i18nConfig.defaultLocale;

// All locale entries with resolved defaults
const allEntries = i18nConfig.locales.map((l) => ({
  code: l.code,
  label: l.label ?? l.code,
  enabled: l.enabled !== false,
}));

/** All configured locale codes (including disabled) — for content slug detection */
export const allKnownLocales = new Set(allEntries.map((l) => l.code));

/** Only enabled locale entries with code and label — for routing and UI */
export const localeEntries: { code: string; label: string }[] = allEntries
  .filter((l) => l.enabled)
  .map(({ code, label }) => ({ code, label }));

/** All enabled locale codes as a set for O(1) lookup (module-internal) */
const supportedLocales = new Set(localeEntries.map((l) => l.code));

/** All enabled locale codes as an array */
export const localeList: string[] = localeEntries.map((l) => l.code);

/** Whether multi-locale i18n is active (more than one enabled locale) */
export const isI18nEnabled = localeList.length > 1;

/**
 * Check if a locale code is supported (enabled)
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

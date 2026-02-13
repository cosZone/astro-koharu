/**
 * Shared utilities for [lang]/ locale routes.
 *
 * Convention: [lang]/ mirror pages render the root-level page component (e.g.,
 * `<HomePage />`). The root page derives its locale from `Astro.url.pathname`
 * via `getLocaleFromUrl()` — this works because Astro generates the page at
 * the locale-prefixed path (e.g., `/en/index.html`), so the URL naturally
 * includes the locale segment. No explicit locale prop is needed.
 */

import { defaultLocale, localeList } from '@/i18n/config';

/**
 * getStaticPaths for static pages (no dynamic params besides [lang]).
 * Returns all non-default locales so that `/en/archives`, `/en/friends`, etc. are generated.
 * Default locale pages are served by the root-level files without prefix.
 */
export function getLocaleStaticPaths() {
  return localeList.filter((l) => l !== defaultLocale).map((lang) => ({ params: { lang } }));
}

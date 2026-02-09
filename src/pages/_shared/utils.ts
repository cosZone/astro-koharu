/**
 * Shared utilities for [lang]/ locale routes.
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

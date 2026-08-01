/**
 * Resolved site configuration.
 *
 * The single place where `config/site.yaml` is turned into normalized values.
 * Everything here is derived through the pure normalizers in this directory, so
 * lower layers (`src/lib/**`) can depend on config without importing the
 * assembly layer in `src/constants/**`.
 */

import yamlConfig from '../../../config/site.yaml';
import { DEFAULT_TIMEZONE, isValidTimezone } from '../timezone';
import { normalizeContentConfig } from './content';
import { enabledFeaturedSeriesSlugs, normalizeFeaturedSeries } from './featured-series';
import { RESERVED_ROUTES } from './reserved-routes';
import type { I18nConfig, ResolvedContentConfig, ResolvedSiteConfig } from './types';

/** Category name → URL slug map, e.g. `{ '随笔': 'life' }`. */
export const categoryMap: Record<string, string> = yamlConfig.categoryMap ?? {};

/** Validated featured series, always an array with lowercase slugs. */
export const featuredSeriesList = normalizeFeaturedSeries(yamlConfig.featuredSeries, {
  categoryMap: yamlConfig.categoryMap,
  reservedRoutes: RESERVED_ROUTES,
});

/** Slugs of the series that are enabled — used to reserve their routes. */
export const enabledSeriesSlugList = enabledFeaturedSeriesSlugs(featuredSeriesList);

export const i18nConfig: I18nConfig = yamlConfig.i18n ?? {
  defaultLocale: 'zh',
  locales: [{ code: 'zh', label: '中文' }],
};

/** Locale codes that are not disabled — used to reserve their URL prefixes. */
export const enabledLocaleCodes = i18nConfig.locales.flatMap((locale) => (locale.enabled !== false ? [locale.code] : []));

/** Content processing flags with field-level defaults applied. */
export const contentConfig: ResolvedContentConfig = normalizeContentConfig(yamlConfig.content);

/**
 * Site timezone in IANA format.
 * Falls back to {@link DEFAULT_TIMEZONE} when the configured value is invalid.
 */
export const siteTimezone: string = (() => {
  const configured = yamlConfig.site.timezone ?? DEFAULT_TIMEZONE;
  if (!isValidTimezone(configured)) {
    console.warn(`[config] Invalid timezone "${configured}", falling back to "${DEFAULT_TIMEZONE}"`);
    return DEFAULT_TIMEZONE;
  }
  return configured;
})();

export const siteConfig: ResolvedSiteConfig = {
  title: yamlConfig.site.title,
  alternate: yamlConfig.site.alternate,
  subtitle: yamlConfig.site.subtitle,
  name: yamlConfig.site.name,
  description: yamlConfig.site.description,
  avatar: yamlConfig.site.avatar,
  showLogo: yamlConfig.site.showLogo,
  author: yamlConfig.site.author,
  site: yamlConfig.site.url,
  startYear: yamlConfig.site.startYear,
  defaultOgImage: yamlConfig.site.defaultOgImage,
  keywords: yamlConfig.site.keywords,
  breadcrumbHome: yamlConfig.site.breadcrumbHome,
  featuredCategories: yamlConfig.featuredCategories,
  featuredSeries: featuredSeriesList,
  enableSlugTransliteration: yamlConfig.site.enableSlugTransliteration,
};

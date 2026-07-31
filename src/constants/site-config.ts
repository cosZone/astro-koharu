/**
 * Site configuration assembly layer.
 *
 * Re-exports the normalized values from `@lib/config/site` and maps the
 * remaining YAML sections onto their runtime shapes. Nothing under `src/lib/**`
 * may import this module — depend on `@lib/config/*` instead.
 */

import { normalizeMomentsConfig, resolveMomentsNavigation } from '@lib/config/moments';
import {
  contentConfig,
  enabledLocaleCodes,
  enabledSeriesSlugList,
  featuredSeriesList,
  i18nConfig,
  siteConfig,
  siteTimezone,
} from '@lib/config/site';
import type {
  AnalyticsConfig,
  BangumiConfig,
  BgmAudioGroup,
  ChristmasConfig,
  CommentConfig,
  DevConfig,
  RouterItem,
  SocialConfig,
} from '@lib/config/types';
import { createUmamiStatsConfig } from '@lib/umami-stats';
import type { UmamiStatsConfig } from '@/types/umami-stats';
import yamlConfig from '../../config/site.yaml';
import { DEFAULT_ROUTERS, RESERVED_ROUTES } from './router';

export { contentConfig, i18nConfig, siteConfig, siteTimezone };

export const socialConfig: SocialConfig = yamlConfig.social ?? {};

// ICP filing config — normalize string shorthand to { text } object
export const icpConfig: { text: string; link?: string } | undefined = (() => {
  const raw = yamlConfig.site.icp;
  if (!raw) return undefined;
  if (typeof raw === 'string') return { text: raw };
  return raw;
})();

const { title, alternate, subtitle } = siteConfig;

export const seoConfig = {
  title: `${alternate ? `${alternate} = ` : ''}${title}${subtitle ? ` = ${subtitle}` : ''}`,
  description: siteConfig.description,
  keywords: siteConfig?.keywords?.join(',') ?? '',
  url: siteConfig.site,
};

const BUILT_IN_COVERS = Array.from({ length: 21 }, (_, i) => `/img/cover/${i + 1}.webp`);
export const defaultCoverList = yamlConfig?.defaultCoverList?.length ? yamlConfig.defaultCoverList : BUILT_IN_COVERS;

// Map YAML comment config
export const commentConfig: CommentConfig = yamlConfig.comment || {};

// Map YAML analytics config
export const analyticsConfig: AnalyticsConfig = yamlConfig.analytics || {};

const _umami = analyticsConfig?.umami;

/** Pre-computed site-wide pageview stats config. null when disabled or token missing. */
export const umamiSiteStatsConfig: UmamiStatsConfig | null =
  _umami?.enabled && _umami.statistics_display?.token && _umami.statistics_display?.footer_site_stats
    ? createUmamiStatsConfig(_umami)
    : null;

/** Create per-page article stats config. Returns null when disabled or token missing. */
export function createArticleStatsConfig(href: string): UmamiStatsConfig | null {
  return _umami?.enabled && _umami.statistics_display?.token && _umami.statistics_display?.article_page_views
    ? createUmamiStatsConfig(_umami, href)
    : null;
}

// Map YAML christmas config with defaults
export const christmasConfig: ChristmasConfig = yamlConfig.christmas || {
  enabled: false,
  features: {
    snowfall: true,
    christmasColorScheme: true,
    christmasCoverDecoration: true,
    christmasHat: true,
    readingTimeSnow: true,
  },
  snowfall: {
    speed: 0.5,
    intensity: 0.7,
    mobileIntensity: 0.4,
    maxLayers: 6,
    maxIterations: 8,
    mobileMaxLayers: 4,
    mobileMaxIterations: 6,
  },
};

// Map YAML bgm config
export const bgmConfig: { enabled: boolean; metingApi?: string; audio: BgmAudioGroup[] } = {
  enabled: yamlConfig.bgm?.enabled ?? (yamlConfig.bgm?.audio?.length ?? 0) > 0,
  metingApi: yamlConfig.bgm?.metingApi,
  audio: yamlConfig.bgm?.audio ?? [],
};

// Bangumi media tracking config — null when disabled (section commented out in YAML)
export const bangumiConfig: BangumiConfig | null = yamlConfig.bangumi ?? null;

/** Validated opt-in moments configuration. Disabled when the YAML section is absent. */
export const momentsConfig = normalizeMomentsConfig(yamlConfig.moments, {
  reservedRoutes: RESERVED_ROUTES,
  localeCodes: enabledLocaleCodes,
  seriesSlugs: enabledSeriesSlugList,
});

const momentsRouters = resolveMomentsNavigation(yamlConfig.navigation ?? DEFAULT_ROUTERS, momentsConfig);

// Navigation routers with resolved feature placeholders and auto-injected bangumi entry
export const routers: RouterItem[] = bangumiConfig
  ? [
      ...momentsRouters,
      {
        name: bangumiConfig.label,
        nameKey: bangumiConfig.label ? undefined : 'nav.bangumi',
        path: '/bangumi',
        icon: bangumiConfig.icon ?? 'ri:bilibili-fill',
      },
    ]
  : momentsRouters;

// Map YAML dev tools config with defaults (dev only)
export const devConfig: DevConfig = {
  localProjectPath: yamlConfig.dev?.localProjectPath ?? '',
  contentRelativePath: yamlConfig.dev?.contentRelativePath ?? 'src/content/blog',
  editors: yamlConfig.dev?.editors ?? [],
};

/** All configured series slugs (lowercase) */
export const configuredSeriesSlugs = new Set(featuredSeriesList.map((series) => series.slug));

/** Only enabled series slugs (lowercase) */
export const enabledSeriesSlugs = new Set(enabledSeriesSlugList);

/**
 * Locale routing primitives shared by root pages and their `[lang]/` mirrors.
 *
 * Every localized route exists twice on disk: an unprefixed root file that serves
 * `defaultLocale`, and a `[lang]/` mirror that serves every other enabled locale.
 * `localePaths()` lets a route declare its parameter space **once** — the returned
 * `root` / `mirror` pair feed the two `getStaticPaths` exports and inject the
 * resolved `locale` into props, so pages receive their locale explicitly instead
 * of re-deriving it from `Astro.url.pathname`.
 */

import type { GetStaticPathsOptions, PaginateFunction } from 'astro';
import { defaultLocale, localeList } from '@/i18n/config';

/** Enabled locales that are served under a `/<locale>/` prefix. */
const nonDefaultLocales: string[] = localeList.filter((locale) => locale !== defaultLocale);

type RouteParams = Record<string, string | undefined>;

interface LocaleRouteEntry {
  params: RouteParams;
  props?: Record<string, unknown>;
}

export interface LocaleEnumerateContext {
  locale: string;
  /** Params every entry must carry: `{ lang }` under a `[lang]/` mirror, `{}` at the root. */
  localeParams: RouteParams;
  paginate: PaginateFunction;
}

type LocaleEnumerate = (context: LocaleEnumerateContext) => LocaleRouteEntry[] | Promise<LocaleRouteEntry[]>;

type LocaleGetStaticPaths = (options: GetStaticPathsOptions) => Promise<LocaleRouteEntry[]>;

interface LocaleRoute {
  /** `getStaticPaths` for the unprefixed root file (default locale only). */
  root: LocaleGetStaticPaths;
  /** `getStaticPaths` for the `[lang]/` mirror (all non-default locales). */
  mirror: LocaleGetStaticPaths;
}

/**
 * Turn a single "how is this route enumerated for one locale" callback into the
 * root/mirror `getStaticPaths` pair. `locale` is always added to props.
 */
export function localePaths(enumerate: LocaleEnumerate): LocaleRoute {
  const build =
    (locales: string[], prefixed: boolean): LocaleGetStaticPaths =>
    async ({ paginate }) => {
      const entries: LocaleRouteEntry[] = [];
      for (const locale of locales) {
        const localeParams: RouteParams = prefixed ? { lang: locale } : {};
        for (const entry of await enumerate({ locale, localeParams, paginate })) {
          entries.push({ params: { ...entry.params, ...localeParams }, props: { ...entry.props, locale } });
        }
      }
      return entries;
    };

  return { root: build([defaultLocale], false), mirror: build(nonDefaultLocales, true) };
}

/** Route for pages with no dynamic params of their own — only the `[lang]` mirror is generated. */
const staticRoute = localePaths(() => [{ params: {} }]);

/**
 * `getStaticPaths` for `[lang]/` mirrors of static pages.
 * The default-locale variant is served by the unprefixed root file.
 */
export const getLocaleStaticPaths = staticRoute.mirror;

const PAGE_MODULES = import.meta.glob('/src/pages/**/*.{astro,md,mdx,ts}');

/** Root routes that intentionally have no `[lang]/` mirror. */
const MIRROR_EXEMPT = new Set([
  // Static hosts serve a single /404.html; the page localizes itself at runtime.
  '404',
  // Locale-agnostic RSS stylesheet asset.
  'rss/feed.xsl',
]);

const toRoute = (moduleKey: string) => moduleKey.replace('/src/pages/', '').replace(/\.(astro|md|mdx|ts)$/, '');

/**
 * Build-time invariant: every root route has a `[lang]/` counterpart.
 * Without this a forgotten mirror degrades silently into a 404 under `/en/`.
 */
function assertLocaleMirrorsComplete(): void {
  if (nonDefaultLocales.length === 0) return;

  const roots = new Set<string>();
  const mirrors = new Set<string>();
  for (const moduleKey of Object.keys(PAGE_MODULES)) {
    const route = toRoute(moduleKey);
    if (route.startsWith('_')) continue;
    if (route.startsWith('[lang]/')) mirrors.add(route.slice('[lang]/'.length));
    else if (!MIRROR_EXEMPT.has(route)) roots.add(route);
  }

  const missing = [...roots].filter((route) => !mirrors.has(route)).sort();
  if (missing.length > 0) {
    throw new Error(
      `[i18n] Missing src/pages/[lang]/ mirror for: ${missing.join(', ')}. ` +
        'Add the mirror page, or list the route in MIRROR_EXEMPT (src/pages/_shared/utils.ts) if it is intentionally locale-agnostic.',
    );
  }
}

assertLocaleMirrorsComplete();

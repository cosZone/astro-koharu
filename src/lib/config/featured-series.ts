/**
 * Featured series configuration normalization.
 *
 * Accepts the legacy single-object form as well as the array form, fills in a
 * default slug and validates every entry. All route knowledge is injected so
 * this module stays pure and testable.
 */

import type { FeaturedSeriesItem } from './types';

const SLUG_PATTERN = /^[a-z0-9-_]+$/i;
const DEFAULT_SLUG = 'series';

export interface FeaturedSeriesContext {
  /** Category name → URL slug map from `categoryMap` in `config/site.yaml`. */
  categoryMap?: Record<string, string>;
  /** Route names a series slug may not claim. */
  reservedRoutes?: Iterable<string>;
  /** Sink for non-fatal diagnostics. Defaults to `console.warn`. */
  onWarning?: (message: string) => void;
}

function configError(message: string): never {
  throw new Error(`Featured series configuration error: ${message}`);
}

function isFeaturedSeriesItem(value: unknown): value is FeaturedSeriesItem {
  if (typeof value !== 'object' || value === null) return false;

  const item = value as Record<string, unknown>;
  if (typeof item.categoryName !== 'string' || item.categoryName.trim() === '') return false;
  if (item.slug !== undefined && typeof item.slug !== 'string') return false;
  if (item.label !== undefined && typeof item.label !== 'string') return false;
  if (item.enabled !== undefined && typeof item.enabled !== 'boolean') return false;
  return true;
}

/**
 * Normalize `featuredSeries` into a validated array with lowercase slugs.
 * Throws on invalid shape, empty/malformed slugs, reserved slugs and duplicates.
 */
export function normalizeFeaturedSeries(raw: unknown, context: FeaturedSeriesContext = {}): FeaturedSeriesItem[] {
  if (!raw) return [];

  const { categoryMap, onWarning = (message: string) => console.warn(message) } = context;
  const reservedRoutes = new Set(Array.from(context.reservedRoutes ?? [], (route) => route.toLowerCase()));
  const items: unknown[] = Array.isArray(raw) ? raw : [raw];

  const slugOwners = new Set<string>();
  return items.map((item, index): FeaturedSeriesItem => {
    if (!isFeaturedSeriesItem(item)) {
      configError(
        `Item at index ${index} is not a valid FeaturedSeriesItem.\n` +
          `Expected an object with at least a 'categoryName' string field.\n` +
          `Received: ${JSON.stringify(item, null, 2)}`,
      );
    }

    const rawSlug = item.slug || categoryMap?.[item.categoryName] || DEFAULT_SLUG;
    const slug = rawSlug.trim().toLowerCase();

    if (!slug) configError(`Missing or invalid "slug" field. Each series must have a non-empty slug.`);
    if (!SLUG_PATTERN.test(slug)) {
      configError(`Invalid slug "${rawSlug}". Slugs must contain only alphanumeric characters, hyphens, and underscores.`);
    }
    if (reservedRoutes.has(slug)) {
      configError(
        `Slug "${rawSlug}" conflicts with a reserved route. ` +
          `Reserved routes are: ${Array.from(reservedRoutes).join(', ')}. Please choose a different slug.`,
      );
    }
    if (slugOwners.has(slug)) {
      configError(`Duplicate slug "${rawSlug}". Each series must have a unique slug.`);
    }
    slugOwners.add(slug);

    if (categoryMap && !categoryMap[item.categoryName]) {
      onWarning(
        `[Warning] Featured series "${slug}": Category "${item.categoryName}" not found in categoryMap. ` +
          `Consider adding it to config/site.yaml for proper URL mapping.`,
      );
    }

    return { ...item, slug };
  });
}

/** Slugs of series that are not explicitly disabled. */
export function enabledFeaturedSeriesSlugs(series: readonly FeaturedSeriesItem[]): string[] {
  return series.flatMap((item) => (item.enabled !== false ? [item.slug] : []));
}

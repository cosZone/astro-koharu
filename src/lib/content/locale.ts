/**
 * Content locale utilities
 *
 * Detects locale from content collection slugs and provides
 * locale-aware filtering with fallback support.
 */

import type { BlogPost } from 'types/blog';
import { allKnownLocales, defaultLocale } from '@/i18n/config';

export interface SlugLocaleInfo {
  /** Detected locale code (e.g., 'en') or defaultLocale if none found */
  locale: string;
  /** Slug with locale prefix stripped (e.g., 'tools/getting-started') */
  localeFreeSlug: string;
}

/**
 * Extract locale info from a content collection slug.
 *
 * Convention: default-locale files live at root (slug = "tools/getting-started"),
 * translations live under `<locale>/` (slug = "en/tools/getting-started").
 *
 * Uses `allKnownLocales` (including disabled locales) to detect directory prefixes,
 * so posts in disabled locale directories are correctly excluded by filterPostsByLocale.
 *
 * @example
 * getSlugLocaleInfo('tools/getting-started')     // { locale: 'zh', localeFreeSlug: 'tools/getting-started' }
 * getSlugLocaleInfo('en/tools/getting-started')   // { locale: 'en', localeFreeSlug: 'tools/getting-started' }
 */
export function getSlugLocaleInfo(slug: string): SlugLocaleInfo {
  const firstSlash = slug.indexOf('/');
  if (firstSlash === -1) {
    // No slash → single-segment slug, always default locale
    return { locale: defaultLocale, localeFreeSlug: slug };
  }

  const firstSegment = slug.slice(0, firstSlash);

  if (firstSegment !== defaultLocale && allKnownLocales.has(firstSegment)) {
    return {
      locale: firstSegment,
      localeFreeSlug: slug.slice(firstSlash + 1),
    };
  }

  return { locale: defaultLocale, localeFreeSlug: slug };
}

/**
 * Get the locale of a blog post.
 */
export function getPostLocale(post: BlogPost): string {
  return getSlugLocaleInfo(post.slug).locale;
}

/**
 * Get the locale-free slug for a blog post.
 * Prefers `post.data.link` (custom permalink) over the computed locale-free slug.
 */
export function getPostSlug(post: BlogPost): string {
  return post.data.link ?? getSlugLocaleInfo(post.slug).localeFreeSlug;
}

/**
 * Filter posts by locale with fallback support.
 *
 * - `locale = undefined` → return all posts (backward-compatible)
 * - `locale = defaultLocale` → only default-locale posts
 * - `locale = 'en'` (non-default) → en translations + default-locale posts
 *   that have no en translation (fallback)
 */
export function filterPostsByLocale(posts: BlogPost[], locale?: string): BlogPost[] {
  if (locale === undefined) return posts;

  if (locale === defaultLocale) {
    // Only return posts whose locale is the default
    return posts.filter((post) => getPostLocale(post) === defaultLocale);
  }

  // Non-default locale: collect translations and fallback for untranslated
  const translatedSlugs = new Set<string>();
  const translated: BlogPost[] = [];
  const defaultPosts: BlogPost[] = [];

  for (const post of posts) {
    const postLocale = getPostLocale(post);
    if (postLocale === locale) {
      translated.push(post);
      translatedSlugs.add(getPostSlug(post));
    } else if (postLocale === defaultLocale) {
      defaultPosts.push(post);
    }
    // Posts in other non-default locales are excluded
  }

  // Add default-locale posts that have no translation as fallback
  const fallback = defaultPosts.filter((post) => !translatedSlugs.has(getPostSlug(post)));

  // Merge and re-sort by date (newest first) to maintain consistent ordering
  const merged = [...translated, ...fallback];
  merged.sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

  return merged;
}

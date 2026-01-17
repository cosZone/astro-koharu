import type { Router } from '@constants/router';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// =============================================================================
// Navigation Utilities
// =============================================================================

/**
 * Extract the base slug from a navigation path
 * @param path - Navigation path (e.g., '/weekly', '/reading?page=1')
 * @returns Normalized slug or null if invalid
 * @example normalizeNavSlug('/weekly') => 'weekly'
 * @example normalizeNavSlug('/posts/1') => null (has nested path)
 */
export function normalizeNavSlug(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return null;

  // Remove query string and hash, then trailing slashes
  const basePath = trimmed.split(/[?#]/)[0].replace(/\/+$/, '');
  if (!basePath || basePath === '/') return null;

  const slug = basePath.slice(1); // Remove leading '/'
  // Only return single-segment paths (no nested routes)
  if (!slug || slug.includes('/')) return null;

  return slug.toLowerCase();
}

/**
 * Filter navigation items based on enabled series slugs
 * Removes items that point to disabled series routes
 *
 * @param items - Navigation items to filter
 * @param configuredSlugs - Set of all configured series slugs (lowercase)
 * @param enabledSlugs - Set of enabled series slugs (lowercase)
 * @param reservedSlugs - Set of reserved static route slugs (lowercase)
 * @returns Filtered navigation items
 */
export function filterNavItems(
  items: Router[],
  configuredSlugs: Set<string>,
  enabledSlugs: Set<string>,
  reservedSlugs: Set<string>,
): Router[] {
  return items
    .map((item) => {
      // Recursively filter children first
      const children = item.children ? filterNavItems(item.children, configuredSlugs, enabledSlugs, reservedSlugs) : undefined;
      const slug = item.path ? normalizeNavSlug(item.path) : null;

      // Filter out disabled series routes
      if (slug && configuredSlugs.has(slug) && !enabledSlugs.has(slug)) {
        return null;
      }

      // Filter out empty parent items (no path and no children)
      if (!item.path && (!children || children.length === 0)) {
        return null;
      }

      return children && children.length > 0 ? { ...item, children } : { ...item, children: undefined };
    })
    .filter((item): item is Router => Boolean(item));
}

/**
 * Fisher-Yates shuffle algorithm
 * @param array - Array to shuffle
 * @returns New shuffled array (does not mutate original)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Normalize URL by removing trailing slashes from origin
 * Uses URL API for robust parsing
 * @example normalizeUrl('https://example.com/') => 'https://example.com'
 * @example normalizeUrl('https://example.com:8080/') => 'https://example.com:8080'
 */
export function normalizeUrl(url: string | undefined): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    // Return origin (protocol + host + port) without trailing slash
    return parsed.origin;
  } catch {
    // Fallback for invalid URLs
    return url.replace(/\/+$/, '');
  }
}

// Import YAML config directly - processed by @rollup/plugin-yaml

import type { RouterItem } from '@lib/config/types';
import yamlConfig from '../../config/site.yaml';

export type Router = RouterItem;

// Routes enum kept for backwards compatibility
export enum Routes {
  Home = '/',
  About = '/about',
  Categories = '/categories',
  Tags = '/tags',
  Friends = '/friends',
  Post = '/post',
  Archives = '/archives',
}

// Reserved routes that cannot be used as series slugs
// Includes: static routes, Astro internals, and potentially dangerous paths
export const RESERVED_ROUTES = new Set([
  // Static pages
  'about',
  'categories',
  'tags',
  'friends',
  'post',
  'posts',
  'archives',
  '404',
  // Special files
  'rss.xml',
  'sitemap.xml',
  'robots.txt',
  'favicon.ico',
  // Astro internals (prevent potential conflicts)
  '_astro',
  '@fs',
  'api',
]);

/**
 * Get the URL path for a featured series
 * @param slug - The series slug (e.g., 'weekly')
 * @returns The full path (e.g., '/weekly')
 */
export function getSeriesPath(slug: string): string {
  return `/${slug}`;
}

/**
 * Check if a slug is reserved (conflicts with existing routes)
 * @param slug - The slug to check
 * @returns true if the slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_ROUTES.has(slug.toLowerCase());
}

export const routers: Router[] = yamlConfig.navigation ?? [
  { name: 'Home', path: Routes.Home, icon: 'fa6-solid:house-chimney' },
  { name: 'About', path: Routes.About, icon: 'fa6-regular:circle-user' },
];

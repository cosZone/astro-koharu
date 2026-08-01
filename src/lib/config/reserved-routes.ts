/**
 * Route names that cannot be claimed by user configuration.
 *
 * Lives in the config layer (not `constants/router`) so pure normalizers and
 * `astro.config.mjs` can consume it without importing the assembly layer.
 */

export const RESERVED_ROUTES = new Set([
  // Static pages
  'about',
  'categories',
  'tags',
  'friends',
  'post',
  'posts',
  'archives',
  'bangumi',
  'music',
  '404',
  // Special files
  'rss.xml',
  'rss',
  'sitemap.xml',
  'sitemap-index.xml',
  'robots.txt',
  'favicon.ico',
  // Astro internals (prevent potential conflicts)
  '_astro',
  '_actions',
  '_image',
  '_server-islands',
  '@fs',
  'api',
]);

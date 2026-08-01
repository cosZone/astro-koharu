/**
 * Document-metadata contract between pages, `Layout` and `HeadMeta`.
 *
 * `HeadMeta` owns every `<head>` derivation (canonical, OG image fallbacks,
 * hreflang, RSS links); pages only describe *what* the page is.
 */

export interface PageOpenGraph {
  title?: string;
  description?: string;
  /** Relative paths are resolved against `Astro.site`. */
  image?: string;
  type?: 'website' | 'article';
  url?: string;
}

export interface RssFeedLink {
  href: string;
  title: string;
}

/** Metadata a page may override. Every field is optional — `HeadMeta` fills the defaults. */
export interface PageMetaProps {
  /** Override canonical URL (e.g. fallback pages pointing at the default-locale version). */
  canonical?: string;
  keywords?: string[];
  openGraph?: PageOpenGraph;
  /** Robots directive for dynamic or otherwise non-indexable pages. */
  robots?: string;
  /** Alternate RSS feeds. Pass `[]` to emit none; omit to keep the site's default feed. */
  rssFeeds?: RssFeedLink[];
  /** Disable locale hreflang links for a canonical route that is not duplicated per locale. */
  includeLocaleAlternates?: boolean;
}

export interface PageMeta extends PageMetaProps {
  locale: string;
  title: string;
  description?: string;
  /** Cover image seeding the OG image fallback chain (cover → defaultOgImage → avatar). */
  coverImage?: string;
}

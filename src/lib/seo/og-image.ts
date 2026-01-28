import { siteConfig } from '@constants/site-config';

/**
 * Get the OG image URL with proper fallback chain
 * Priority: cover → defaultOgImage → avatar
 *
 * @param cover - Optional post cover image path
 * @param site - Site URL for absolute URL generation
 * @returns Absolute URL string or undefined
 */
export function getOgImageUrl(cover: string | undefined, site: URL | undefined): string | undefined {
  const imagePath = cover || siteConfig.defaultOgImage || siteConfig.avatar;
  return imagePath && site ? new URL(imagePath, site).href : undefined;
}

/**
 * Slug transliteration utility
 *
 * Converts non-ASCII slugs (Chinese, Japanese, etc.) to romanized form
 * using the `transliteration` library. Gated by `enableSlugTransliteration`.
 */

import { slugify } from 'transliteration';
import { siteConfig } from '@/constants/site-config';

/**
 * Transliterate a slug containing non-ASCII characters to ASCII.
 * Preserves path separators (/) and common URL-safe characters.
 * Returns the slug unchanged when `enableSlugTransliteration` is off.
 *
 * @example
 * // with enableSlugTransliteration = true:
 * transliterateSlug('测试')                // 'ce-shi'
 * transliterateSlug('おはようございます')  // 'ohayougozaimasu'
 * transliterateSlug('React学习笔记')       // 'react-xue-xi-bi-ji'
 * transliterateSlug('tools/getting-started') // 'tools/getting-started'
 */
export function transliterateSlug(slug: string): string {
  if (!siteConfig.enableSlugTransliteration) return slug;
  return slugify(slug, { allowedChars: 'a-zA-Z0-9-_.~/', separator: '-' });
}

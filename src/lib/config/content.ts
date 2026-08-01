/**
 * Content processing configuration normalization.
 *
 * Single source of truth for `content:` defaults in `config/site.yaml`.
 * Defaults are applied per field, so a partial YAML section keeps the defaults
 * for every field it does not mention.
 */

import type { ContentConfig, PostCardImagePosition, ResolvedContentConfig } from './types';

export const CONTENT_DEFAULTS: ResolvedContentConfig = {
  addBlankTarget: true,
  smoothScroll: true,
  addHeadingLevel: true,
  enhanceCodeBlock: true,
  enableCodeCopy: true,
  enableCodeFullscreen: true,
  enableLinkEmbed: true,
  enableTweetEmbed: true,
  enableOGPreview: true,
  enableCodePenEmbed: true,
  previewCacheTime: 30,
  lazyLoadEmbeds: true,
  postCardImagePosition: 'alternating',
  enableShokaContainers: true,
  enableShokaAttrs: true,
  enableShokaEffects: true,
  enableShokaSpoiler: true,
  enableShokaRuby: true,
  enableShokaHexoTags: true,
  enableMath: true,
  enableCodeMeta: true,
  enableQuiz: true,
  enableEncryptedBlock: false,
};

const IMAGE_POSITIONS: readonly PostCardImagePosition[] = ['alternating', 'left', 'right'];

/**
 * Resolve the raw `content:` YAML section into a fully populated config.
 * Values of the wrong type fall back to the default for that field.
 */
export function normalizeContentConfig(raw?: Partial<ContentConfig> | null): ResolvedContentConfig {
  const source = (raw ?? {}) as Record<string, unknown>;
  const resolved = { ...CONTENT_DEFAULTS };

  for (const [key, fallback] of Object.entries(CONTENT_DEFAULTS)) {
    if (typeof fallback !== 'boolean') continue;
    if (typeof source[key] === 'boolean') Reflect.set(resolved, key, source[key]);
  }

  const cacheTime = source.previewCacheTime;
  if (typeof cacheTime === 'number' && Number.isFinite(cacheTime) && cacheTime >= 0) {
    resolved.previewCacheTime = cacheTime;
  }

  const imagePosition = source.postCardImagePosition;
  if (IMAGE_POSITIONS.includes(imagePosition as PostCardImagePosition)) {
    resolved.postCardImagePosition = imagePosition as PostCardImagePosition;
  }

  return resolved;
}

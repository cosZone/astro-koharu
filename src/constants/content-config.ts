// Import YAML config directly - processed by @rollup/plugin-yaml

import type { ContentConfig } from '@lib/config/types';
import yamlConfig from '../../config/site.yaml';

// Re-export type for backwards compatibility
export type { ContentConfig };

export const defaultContentConfig: ContentConfig = yamlConfig.content ?? {
  addBlankTarget: true,
  smoothScroll: true,
  addHeadingLevel: true,
  enhanceCodeBlock: true,
  enableCodeCopy: true,
  enableCodeFullscreen: true,
  enableLinkEmbed: true,
  enableTweetEmbed: true,
  enableOGPreview: true,
  previewCacheTime: 3600, // 1 hour
  lazyLoadEmbeds: true,
};

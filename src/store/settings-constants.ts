/**
 * Settings defaults, localStorage keys, and WenKai font metadata.
 *
 * Single source of truth shared by the settings store and the FOUC-prevention script in
 * Layout.astro. Kept free of nanostores so Layout.astro can import it at build time without
 * pulling store side effects into the SSR bundle.
 */

export const FONT_PRESETS = ['round', 'system', 'serif', 'wenkai'] as const;
export type FontPreset = (typeof FONT_PRESETS)[number];

export const READER_DEFAULTS = {
  fontPreset: 'round' as FontPreset,
  fontSize: 16,
  lineHeight: 1.8,
  measure: null as number | null,
  justify: false,
};

/** Starting point when the user leaves automatic width through the stepper. */
export const READER_CUSTOM_MEASURE = 65;

/** Prevent malformed localStorage values from creating oversized inline styles. */
export const READER_FONT_FAMILY_MAX_LENGTH = 128;

export const GENERAL_DEFAULTS = {
  scrollProgress: true,
  bgmWidget: true,
  masterMotion: false,
  wave: true,
};

export const STORAGE_KEYS = {
  fontPreset: 'reader-font-preset',
  fontFamily: 'reader-font-family',
  fontSize: 'reader-font-size',
  lineHeight: 'reader-line-height',
  measure: 'reader-measure',
  justify: 'reader-justify',
  scrollProgress: 'site-scroll-progress',
  bgmWidget: 'site-bgm-widget',
  masterMotion: 'site-master-motion',
  wave: 'site-wave',
} as const;

/** WenKai WebFont loaded on demand from jsDelivr; see docs/adr/0003. */
export const WENKAI_STYLESHEET_ID = 'lxgw-wenkai-webfont';
export const WENKAI_STYLESHEET_HREF = 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css';

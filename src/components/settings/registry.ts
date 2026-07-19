/**
 * Settings Registry
 *
 * Declarative registry for the Settings Center; see docs/adr/0001.
 * Add settings here and implement their application logic in src/store/settings.ts.
 */

import { bgmConfig, christmasConfig } from '@constants/site-config';
import type { TranslationKey } from '@/i18n/types';

export type SettingSection = 'reader' | 'general';
export type SettingType = 'segmented' | 'number' | 'switch';

export interface SettingOption {
  value: string;
  i18nKey: TranslationKey;
}

export interface SettingItem {
  /** Corresponding preference key in the settings store. */
  key: string;
  section: SettingSection;
  type: SettingType;
  i18nKey: TranslationKey;
  /** Display unit for numeric controls; line height has no unit. */
  unit?: string;
  /** Step size for numeric controls. */
  step?: number;
  /** Options for segmented controls. */
  options?: SettingOption[];
  /** Build-time feature gate that hides unavailable settings. */
  gatedBy?: 'christmas' | 'bgm';
  /** Disable this setting while the master motion preference is enabled. */
  disabledByMasterMotion?: boolean;
}

export const SETTINGS_REGISTRY: SettingItem[] = [
  // Reader preferences
  {
    key: 'fontPreset',
    section: 'reader',
    type: 'segmented',
    i18nKey: 'settings.fontPreset',
    options: [
      { value: 'round', i18nKey: 'settings.fontPreset.round' },
      { value: 'system', i18nKey: 'settings.fontPreset.system' },
      { value: 'serif', i18nKey: 'settings.fontPreset.serif' },
      { value: 'wenkai', i18nKey: 'settings.fontPreset.wenkai' },
      { value: 'local', i18nKey: 'settings.fontPreset.local' },
    ],
  },
  {
    key: 'fontSize',
    section: 'reader',
    type: 'number',
    i18nKey: 'settings.fontSize',
    unit: 'px',
    step: 1,
  },
  {
    key: 'lineHeight',
    section: 'reader',
    type: 'number',
    i18nKey: 'settings.lineHeight',
    step: 0.1,
  },
  {
    key: 'measure',
    section: 'reader',
    type: 'number',
    i18nKey: 'settings.measure',
    unit: 'ch',
    step: 1,
  },
  {
    key: 'justify',
    section: 'reader',
    type: 'switch',
    i18nKey: 'settings.justify',
  },

  // General preferences
  {
    key: 'scrollProgress',
    section: 'general',
    type: 'switch',
    i18nKey: 'settings.scrollProgress',
  },
  {
    key: 'christmas',
    section: 'general',
    type: 'switch',
    i18nKey: 'settings.christmas',
    gatedBy: 'christmas',
  },
  {
    key: 'bgmWidget',
    section: 'general',
    type: 'switch',
    i18nKey: 'settings.bgmWidget',
    gatedBy: 'bgm',
  },
  {
    key: 'masterMotion',
    section: 'general',
    type: 'switch',
    i18nKey: 'settings.masterMotion',
  },
  {
    key: 'wave',
    section: 'general',
    type: 'switch',
    i18nKey: 'settings.wave',
    disabledByMasterMotion: true,
  },
];

/**
 * Hide settings whose build-time feature is unavailable.
 */
export function isSettingVisible(item: SettingItem): boolean {
  if (item.gatedBy === 'christmas') return christmasConfig.enabled;
  if (item.gatedBy === 'bgm') return bgmConfig.enabled && bgmConfig.audio.length > 0;
  return true;
}

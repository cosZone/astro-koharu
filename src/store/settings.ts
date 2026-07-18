/**
 * Settings Center State Management
 *
 * Nanostores-based state for reader and general preferences.
 * Preferences persist in localStorage and sync to documentElement through CSS variables,
 * data attributes, and classes.
 *
 * Defaults and localStorage keys must stay in sync with the FOUC-prevention script in Layout.astro.
 */

import { atom } from 'nanostores';

export type FontPreset = 'round' | 'system' | 'serif' | 'wenkai';

export const READER_DEFAULTS = {
  fontPreset: 'round' as FontPreset,
  fontSize: 16,
  lineHeight: 1.8,
  measure: 65,
  justify: false,
};

export const GENERAL_DEFAULTS = {
  scrollProgress: true,
  bgmWidget: true,
  masterMotion: false,
  wave: true,
};

const STORAGE_KEYS = {
  fontPreset: 'reader-font-preset',
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
const WENKAI_STYLESHEET_ID = 'lxgw-wenkai-webfont';
const WENKAI_STYLESHEET_HREF = 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css';

// Reader preferences
export const readerFontPreset = atom<FontPreset>(READER_DEFAULTS.fontPreset);
export const readerFontSize = atom<number>(READER_DEFAULTS.fontSize);
export const readerLineHeight = atom<number>(READER_DEFAULTS.lineHeight);
export const readerMeasure = atom<number>(READER_DEFAULTS.measure);
export const readerJustify = atom<boolean>(READER_DEFAULTS.justify);

// General preferences
export const scrollProgressEnabled = atom<boolean>(GENERAL_DEFAULTS.scrollProgress);
export const bgmWidgetEnabled = atom<boolean>(GENERAL_DEFAULTS.bgmWidget);
export const masterMotionEnabled = atom<boolean>(GENERAL_DEFAULTS.masterMotion);
export const waveEnabled = atom<boolean>(GENERAL_DEFAULTS.wave);

/**
 * Insert the WenKai stylesheet once when that preset is first selected.
 */
function loadWenkaiFont(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(WENKAI_STYLESHEET_ID)) return;
  const link = document.createElement('link');
  link.id = WENKAI_STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = WENKAI_STYLESHEET_HREF;
  document.head.appendChild(link);
}

/**
 * Synchronize reader preferences to documentElement.
 */
function applyReaderPreferences(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const fontSize = readerFontSize.get();
  root.style.setProperty('--reader-font-size', `${fontSize}px`);
  root.style.setProperty('--reader-line-height', String(readerLineHeight.get()));
  // Convert ch to px so headings and body text share one absolute content width.
  root.style.setProperty('--reader-measure', `${readerMeasure.get() * 0.5 * fontSize}px`);
  root.dataset.fontPreset = readerFontPreset.get();
  root.classList.toggle('reader-justify', readerJustify.get());
}

/**
 * Synchronize general preferences to documentElement classes.
 */
function applyGeneralPreferences(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('motion-off', masterMotionEnabled.get());
  root.classList.toggle('wave-off', !waveEnabled.get());
}

function persist(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

// Reader preference setters

export function setFontPreset(preset: FontPreset): void {
  readerFontPreset.set(preset);
  persist(STORAGE_KEYS.fontPreset, preset);
  if (preset === 'wenkai') loadWenkaiFont();
  applyReaderPreferences();
}

export function setFontSize(px: number): void {
  if (!Number.isFinite(px) || px <= 0) return;
  readerFontSize.set(px);
  persist(STORAGE_KEYS.fontSize, String(px));
  applyReaderPreferences();
}

export function setLineHeight(multiple: number): void {
  if (!Number.isFinite(multiple) || multiple <= 0) return;
  readerLineHeight.set(multiple);
  persist(STORAGE_KEYS.lineHeight, String(multiple));
  applyReaderPreferences();
}

export function setMeasure(ch: number): void {
  if (!Number.isFinite(ch) || ch <= 0) return;
  readerMeasure.set(ch);
  persist(STORAGE_KEYS.measure, String(ch));
  applyReaderPreferences();
}

export function setJustify(enabled: boolean): void {
  readerJustify.set(enabled);
  persist(STORAGE_KEYS.justify, String(enabled));
  applyReaderPreferences();
}

/**
 * Restore reader defaults without changing general preferences.
 */
export function resetReaderPreferences(): void {
  setFontPreset(READER_DEFAULTS.fontPreset);
  setFontSize(READER_DEFAULTS.fontSize);
  setLineHeight(READER_DEFAULTS.lineHeight);
  setMeasure(READER_DEFAULTS.measure);
  setJustify(READER_DEFAULTS.justify);
}

// General preference setters

export function setScrollProgressEnabled(enabled: boolean): void {
  scrollProgressEnabled.set(enabled);
  persist(STORAGE_KEYS.scrollProgress, String(enabled));
}

export function setBgmWidgetEnabled(enabled: boolean): void {
  bgmWidgetEnabled.set(enabled);
  persist(STORAGE_KEYS.bgmWidget, String(enabled));
}

export function setMasterMotionEnabled(enabled: boolean): void {
  masterMotionEnabled.set(enabled);
  persist(STORAGE_KEYS.masterMotion, String(enabled));
  applyGeneralPreferences();
}

export function setWaveEnabled(enabled: boolean): void {
  waveEnabled.set(enabled);
  persist(STORAGE_KEYS.wave, String(enabled));
  applyGeneralPreferences();
}

// Initialization

function readPositiveNumber(key: string, fallback: number): number {
  const stored = Number.parseFloat(localStorage.getItem(key) ?? '');
  return Number.isFinite(stored) && stored > 0 ? stored : fallback;
}

function readBoolean(key: string, fallback: boolean): boolean {
  const stored = localStorage.getItem(key);
  return stored === null ? fallback : stored === 'true';
}

/**
 * Initialize settings state from localStorage
 * Should be called on client-side only
 *
 * Default values (must match Layout.astro FOUC prevention script):
 * - fontPreset: 'round', fontSize: 16, lineHeight: 1.8, measure: 65, justify: false
 * - scrollProgress: true, bgmWidget: true, masterMotion: false, wave: true
 */
export function initSettings(): void {
  if (typeof window === 'undefined') return;

  const storedPreset = localStorage.getItem(STORAGE_KEYS.fontPreset);
  if (storedPreset === 'round' || storedPreset === 'system' || storedPreset === 'serif' || storedPreset === 'wenkai') {
    readerFontPreset.set(storedPreset);
    if (storedPreset === 'wenkai') loadWenkaiFont();
  }
  readerFontSize.set(readPositiveNumber(STORAGE_KEYS.fontSize, READER_DEFAULTS.fontSize));
  readerLineHeight.set(readPositiveNumber(STORAGE_KEYS.lineHeight, READER_DEFAULTS.lineHeight));
  readerMeasure.set(readPositiveNumber(STORAGE_KEYS.measure, READER_DEFAULTS.measure));
  readerJustify.set(readBoolean(STORAGE_KEYS.justify, READER_DEFAULTS.justify));

  scrollProgressEnabled.set(readBoolean(STORAGE_KEYS.scrollProgress, GENERAL_DEFAULTS.scrollProgress));
  bgmWidgetEnabled.set(readBoolean(STORAGE_KEYS.bgmWidget, GENERAL_DEFAULTS.bgmWidget));
  masterMotionEnabled.set(readBoolean(STORAGE_KEYS.masterMotion, GENERAL_DEFAULTS.masterMotion));
  waveEnabled.set(readBoolean(STORAGE_KEYS.wave, GENERAL_DEFAULTS.wave));

  applyReaderPreferences();
  applyGeneralPreferences();
}

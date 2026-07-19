/**
 * Settings Center State Management
 *
 * Nanostores-based state for reader and general preferences.
 * Preferences persist in localStorage and sync to documentElement through CSS variables,
 * data attributes, and classes. Defaults and keys live in ./settings-constants.
 */

import { quoteCssString } from '@lib/css-string';
import { atom } from 'nanostores';
import { closeBgmPanel } from './bgm';
import {
  FONT_PRESETS,
  type FontPreset,
  GENERAL_DEFAULTS,
  READER_DEFAULTS,
  READER_FONT_FAMILY_MAX_LENGTH,
  STORAGE_KEYS,
  WENKAI_STYLESHEET_HREF,
  WENKAI_STYLESHEET_ID,
} from './settings-constants';

export type { FontPreset };

// Reader preferences
export const readerFontPreset = atom<FontPreset>(READER_DEFAULTS.fontPreset);
export const readerFontFamily = atom<string | null>(null);
export const readerFontSize = atom<number>(READER_DEFAULTS.fontSize);
export const readerLineHeight = atom<number>(READER_DEFAULTS.lineHeight);
export const readerMeasure = atom<number | null>(READER_DEFAULTS.measure);
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
  const measure = readerMeasure.get();
  if (measure === null) {
    root.style.removeProperty('--reader-measure');
  } else {
    // Convert ch to px so headings and body text share one absolute content width.
    root.style.setProperty('--reader-measure', `${measure * 0.5 * fontSize}px`);
  }
  root.dataset.fontPreset = readerFontPreset.get();
  const fontFamily = readerFontFamily.get();
  if (fontFamily) {
    root.dataset.readerFont = 'local';
    root.style.setProperty('--reader-font-family', quoteCssString(fontFamily));
  } else {
    delete root.dataset.readerFont;
    root.style.removeProperty('--reader-font-family');
  }
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

function removePersisted(key: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

// Reader preference setters

export function setFontPreset(preset: FontPreset): void {
  readerFontPreset.set(preset);
  readerFontFamily.set(null);
  persist(STORAGE_KEYS.fontPreset, preset);
  removePersisted(STORAGE_KEYS.fontFamily);
  if (preset === 'wenkai') loadWenkaiFont();
  applyReaderPreferences();
}

export function setLocalFontFamily(family: string): void {
  const normalized = family.trim().slice(0, READER_FONT_FAMILY_MAX_LENGTH);
  if (!normalized) return;
  readerFontFamily.set(normalized);
  persist(STORAGE_KEYS.fontFamily, normalized);
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

export function setMeasure(ch: number | null): void {
  if (ch === null) {
    readerMeasure.set(null);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEYS.measure);
    applyReaderPreferences();
    return;
  }
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
  if (!enabled) closeBgmPanel();
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

function readOptionalPositiveNumber(key: string): number | null {
  const stored = Number.parseFloat(localStorage.getItem(key) ?? '');
  return Number.isFinite(stored) && stored > 0 ? stored : null;
}

function readBoolean(key: string, fallback: boolean): boolean {
  const stored = localStorage.getItem(key);
  return stored === null ? fallback : stored === 'true';
}

/**
 * Initialize settings state from localStorage. Client-side only.
 */
export function initSettings(): void {
  if (typeof window === 'undefined') return;

  const storedFontFamily = localStorage.getItem(STORAGE_KEYS.fontFamily)?.trim();
  const fontFamily = storedFontFamily ? storedFontFamily.slice(0, READER_FONT_FAMILY_MAX_LENGTH) : null;
  readerFontFamily.set(fontFamily);

  const storedPreset = localStorage.getItem(STORAGE_KEYS.fontPreset);
  if (storedPreset && FONT_PRESETS.includes(storedPreset as FontPreset)) {
    readerFontPreset.set(storedPreset as FontPreset);
    if (storedPreset === 'wenkai' && !fontFamily) loadWenkaiFont();
  }
  readerFontSize.set(readPositiveNumber(STORAGE_KEYS.fontSize, READER_DEFAULTS.fontSize));
  readerLineHeight.set(readPositiveNumber(STORAGE_KEYS.lineHeight, READER_DEFAULTS.lineHeight));
  readerMeasure.set(readOptionalPositiveNumber(STORAGE_KEYS.measure));
  readerJustify.set(readBoolean(STORAGE_KEYS.justify, READER_DEFAULTS.justify));

  scrollProgressEnabled.set(readBoolean(STORAGE_KEYS.scrollProgress, GENERAL_DEFAULTS.scrollProgress));
  bgmWidgetEnabled.set(readBoolean(STORAGE_KEYS.bgmWidget, GENERAL_DEFAULTS.bgmWidget));
  masterMotionEnabled.set(readBoolean(STORAGE_KEYS.masterMotion, GENERAL_DEFAULTS.masterMotion));
  waveEnabled.set(readBoolean(STORAGE_KEYS.wave, GENERAL_DEFAULTS.wave));

  applyReaderPreferences();
  applyGeneralPreferences();
}

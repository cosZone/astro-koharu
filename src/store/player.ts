/**
 * Global media player state management (audio + video).
 *
 * Each player instance (AudioPlayer or VideoPlayer) has a unique ID.
 * Only one player may be actively playing at any time — starting playback
 * on one player pauses all others. Volume and playback mode preferences
 * persist in localStorage and are shared across audio and video players.
 */

import { atom } from 'nanostores';

export type PlayMode = 'order' | 'random' | 'loop';

/** The ID of the currently playing player instance (audio or video), or null if none. */
export const $activePlayerId = atom<string | null>(null);

const STORAGE_KEY_MODE = 'audio-player-mode';
const STORAGE_KEY_VOLUME = 'audio-player-volume';

/** Read persisted play mode from localStorage. */
export function getStoredMode(): PlayMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY_MODE);
    if (v === 'order' || v === 'random' || v === 'loop') return v;
  } catch {
    // SSR or unavailable
  }
  return 'order';
}

/** Persist play mode to localStorage. */
export function setStoredMode(mode: PlayMode): void {
  try {
    localStorage.setItem(STORAGE_KEY_MODE, mode);
  } catch {
    // skip
  }
}

/** Read persisted volume (0-1) from localStorage. */
export function getStoredVolume(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (v != null) {
      const n = Number.parseFloat(v);
      if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
    }
  } catch {
    // skip
  }
  return 0.7;
}

/** Persist volume to localStorage. */
export function setStoredVolume(volume: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_VOLUME, String(volume));
  } catch {
    // skip
  }
}

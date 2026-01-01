/**
 * Christmas Effects State Management
 *
 * Nanostores-based state for Christmas effects (snowfall, color scheme, hat, etc.)
 * Supports runtime toggle with localStorage persistence.
 *
 * 两种关闭模式：
 * - 下拉装饰球关闭：只关闭特效，装饰球保留（方便再次开启）
 * - 浮动按钮关闭：彻底关闭，装饰球也隐藏
 */

import { christmasConfig } from '@constants/site-config';
import { atom } from 'nanostores';

const STORAGE_KEY = 'christmas-enabled';
const ORNAMENT_HIDDEN_KEY = 'christmas-ornament-hidden';

/**
 * Christmas effects enabled state
 *
 * Controls visibility of all Christmas effects (snowfall, color scheme, hat).
 * Persists to localStorage for user preference.
 */
export const christmasEnabled = atom<boolean>(true);

/**
 * Ornament visibility state
 *
 * Controls whether the ornament toggle is hidden.
 * When true, the ornament is completely hidden (hard close from floating button).
 * When false, the ornament is visible (soft close from pulling ornament).
 */
export const ornamentHidden = atom<boolean>(false);

/**
 * Initialize christmas state from localStorage
 * Should be called on client-side only
 *
 * Default values (must match Layout.astro FOUC prevention script):
 * - christmasEnabled: true (when localStorage is empty AND christmasConfig.enabled is true)
 * - ornamentHidden: false (when localStorage is empty)
 */
export function initChristmasState(): void {
  if (typeof window === 'undefined') return;

  // If christmas feature is disabled at build time, always disable
  if (!christmasConfig.enabled) {
    christmasEnabled.set(false);
    ornamentHidden.set(true);
    syncChristmasClass(false);
    return;
  }

  // Otherwise use user preference from localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  christmasEnabled.set(stored !== 'false'); // Default: true

  const ornamentStored = localStorage.getItem(ORNAMENT_HIDDEN_KEY);
  ornamentHidden.set(ornamentStored === 'true'); // Default: false

  // Apply initial class
  syncChristmasClass(christmasEnabled.get());
}

/**
 * Sync christmas class on html element
 */
function syncChristmasClass(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('christmas', enabled);
}

/**
 * Toggle christmas effects on/off
 */
export function toggleChristmas(): void {
  const newValue = !christmasEnabled.get();
  christmasEnabled.set(newValue);

  // Persist to localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(newValue));
  }

  // Sync class
  syncChristmasClass(newValue);
}

/**
 * Enable christmas effects
 * Also shows the ornament if it was hidden
 */
export function enableChristmas(): void {
  christmasEnabled.set(true);
  ornamentHidden.set(false);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, 'true');
    localStorage.setItem(ORNAMENT_HIDDEN_KEY, 'false');
  }
  syncChristmasClass(true);
}

/**
 * Disable christmas effects (soft close)
 * Only disables effects, ornament remains visible for easy re-enable
 */
export function disableChristmas(): void {
  christmasEnabled.set(false);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, 'false');
  }
  syncChristmasClass(false);
}

/**
 * Disable christmas effects completely (hard close)
 * Disables effects AND hides the ornament toggle
 */
export function disableChristmasCompletely(): void {
  christmasEnabled.set(false);
  ornamentHidden.set(true);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, 'false');
    localStorage.setItem(ORNAMENT_HIDDEN_KEY, 'true');
  }
  syncChristmasClass(false);
}

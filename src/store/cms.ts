/**
 * CMS State Management
 *
 * Nanostores-based state for CMS edit mode and editor preferences.
 * Supports URL parameter activation (?edit=true) and localStorage persistence.
 */

import { cmsConfig } from '@constants/site-config';
import { atom } from 'nanostores';

const EDIT_MODE_KEY = 'cms-edit-mode';

/**
 * CMS edit mode state
 *
 * When true, edit buttons are visible on post pages.
 * Persists to localStorage for convenience.
 */
export const cmsEditMode = atom<boolean>(false);

/**
 * Initialize CMS state from URL parameters and localStorage
 * Should be called on client-side only
 *
 * Activation methods:
 * 1. URL parameter: ?edit=true (also persists to localStorage)
 * 2. localStorage: Previous session's preference
 */
export function initCmsState(): void {
  if (typeof window === 'undefined') return;

  // If CMS is disabled at build time, always disable
  if (!cmsConfig.enabled) {
    cmsEditMode.set(false);
    return;
  }

  // Check URL parameter first
  const urlParams = new URLSearchParams(window.location.search);
  const editParam = urlParams.get('edit');

  if (editParam === 'true') {
    cmsEditMode.set(true);
    localStorage.setItem(EDIT_MODE_KEY, 'true');
  } else if (editParam === 'false') {
    cmsEditMode.set(false);
    localStorage.setItem(EDIT_MODE_KEY, 'false');
  } else {
    // Fall back to localStorage
    cmsEditMode.set(localStorage.getItem(EDIT_MODE_KEY) === 'true');
  }
}

/**
 * Toggle edit mode on/off
 */
export function toggleEditMode(): void {
  const newValue = !cmsEditMode.get();
  cmsEditMode.set(newValue);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(EDIT_MODE_KEY, String(newValue));
  }
}

/**
 * Enable edit mode
 */
export function enableEditMode(): void {
  cmsEditMode.set(true);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(EDIT_MODE_KEY, 'true');
  }
}

/**
 * Disable edit mode
 */
export function disableEditMode(): void {
  cmsEditMode.set(false);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(EDIT_MODE_KEY, 'false');
  }
}

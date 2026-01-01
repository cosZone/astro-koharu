/**
 * useKeyboardShortcut Hook
 *
 * Handles keyboard shortcuts with proper modifier key detection.
 * Automatically cleans up listeners on unmount.
 *
 * @example
 * ```tsx
 * // Single shortcut
 * useKeyboardShortcut({
 *   key: 'k',
 *   modifiers: ['meta'], // Cmd+K on Mac, Ctrl+K on Windows
 *   handler: () => openSearch(),
 * });
 *
 * // Multiple shortcuts
 * useKeyboardShortcuts([
 *   { key: 'k', modifiers: ['meta'], handler: openSearch },
 *   { key: 'Escape', handler: closeModal },
 * ]);
 * ```
 */

import { useEffect, useRef } from 'react';

export type ModifierKey = 'ctrl' | 'meta' | 'shift' | 'alt';

export interface KeyboardShortcutOptions {
  /**
   * The key to listen for (e.g., 'k', 'Escape', 'Enter')
   */
  key: string;

  /**
   * Modifier keys required (ctrl, meta, shift, alt)
   * 'meta' is Cmd on Mac and Ctrl on Windows
   */
  modifiers?: ModifierKey[];

  /**
   * Handler function called when shortcut is triggered
   */
  handler: (event: KeyboardEvent) => void;

  /**
   * Whether the shortcut is enabled
   * @default true
   */
  enabled?: boolean;

  /**
   * Prevent default browser behavior
   * @default true
   */
  preventDefault?: boolean;

  /**
   * Stop event propagation
   * @default false
   */
  stopPropagation?: boolean;

  /**
   * Ignore when focus is in input/textarea/contenteditable
   * @default true
   */
  ignoreInputs?: boolean;
}

/**
 * Check if the current platform is Mac
 */
function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * Check if event matches the shortcut
 */
function matchesShortcut(event: KeyboardEvent, options: KeyboardShortcutOptions): boolean {
  const { key, modifiers = [], ignoreInputs = true } = options;

  // Check if focus is in input element
  if (ignoreInputs) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return false;
    }
  }

  // Check key (case-insensitive for letters)
  const eventKey = event.key.toLowerCase();
  const expectedKey = key.toLowerCase();
  if (eventKey !== expectedKey) return false;

  // Check modifiers
  const expectedModifiers = new Set(modifiers);

  // Handle 'meta' as platform-specific
  const expectMeta = expectedModifiers.has('meta');
  const expectCtrl = expectedModifiers.has('ctrl');

  // On Mac: meta = Cmd, On Windows: meta = Ctrl
  let metaOrCtrlOk = true;
  if (expectMeta || expectCtrl) {
    if (isMac()) {
      // On Mac, 'meta' means Cmd key
      metaOrCtrlOk = expectMeta ? event.metaKey : event.ctrlKey;
    } else {
      // On Windows/Linux, treat 'meta' as Ctrl
      metaOrCtrlOk = expectMeta || expectCtrl ? event.ctrlKey : true;
    }
  } else {
    // No meta/ctrl expected, ensure neither is pressed
    metaOrCtrlOk = !event.metaKey && !event.ctrlKey;
  }

  const shiftOk = expectedModifiers.has('shift') ? event.shiftKey : !event.shiftKey;
  const altOk = expectedModifiers.has('alt') ? event.altKey : !event.altKey;

  return metaOrCtrlOk && shiftOk && altOk;
}

/**
 * Single keyboard shortcut hook
 */
export function useKeyboardShortcut(options: KeyboardShortcutOptions): void {
  const { handler, enabled = true, preventDefault = true, stopPropagation = false } = options;

  // Use ref to always have latest handler without re-subscribing
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (matchesShortcut(event, optionsRef.current)) {
        if (preventDefault) event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        handlerRef.current(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, preventDefault, stopPropagation]);
}

/**
 * Hook for Escape key handling (common pattern)
 */
export function useEscapeKey(handler: () => void, enabled = true): void {
  useKeyboardShortcut({
    key: 'Escape',
    handler,
    enabled,
    ignoreInputs: false, // Escape should work even in inputs
  });
}

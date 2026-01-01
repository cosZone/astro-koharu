/**
 * useTabVisibility Hook
 *
 * Detects when the browser tab becomes visible or hidden.
 * Useful for pausing animations or expensive operations when tab is inactive.
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const isVisible = useTabVisibility();
 *
 *   if (!isVisible) {
 *     return null; // or static version
 *   }
 *
 *   return <ExpensiveAnimation />;
 * }
 * ```
 */

import { useSyncExternalStore } from 'react';

// Singleton store for tab visibility
let isVisible = typeof document !== 'undefined' ? !document.hidden : true;
const listeners = new Set<() => void>();

function handleVisibilityChange() {
  const newIsVisible = !document.hidden;
  if (isVisible !== newIsVisible) {
    isVisible = newIsVisible;
    for (const listener of listeners) {
      listener();
    }
  }
}

// Set up global listener once
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

const store = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => isVisible,
  getServerSnapshot: () => true, // Assume visible on server
};

/**
 * Returns true if the browser tab is visible, false if hidden
 */
export function useTabVisibility(): boolean {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

/**
 * Returns true if the browser tab is hidden (inverse of useTabVisibility)
 */
export function useTabHidden(): boolean {
  return !useTabVisibility();
}

/**
 * Execute callback when visibility changes
 */
export function useOnVisibilityChange(callback: (isVisible: boolean) => void): void {
  const visible = useTabVisibility();

  // This will trigger callback on every visibility change
  // due to useSyncExternalStore's automatic re-render
  if (typeof window !== 'undefined') {
    // Use effect-like pattern but avoid useEffect
    // to ensure callback is called synchronously
    callback(visible);
  }
}

export default useTabVisibility;

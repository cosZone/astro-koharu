/**
 * useMediaQuery Hook
 *
 * Hook for responding to media query changes (responsive breakpoints).
 * Uses useSyncExternalStore for optimal React 18+ compatibility.
 *
 * @example
 * ```tsx
 * function Component() {
 *   const isMobile = useMediaQuery('(max-width: 768px)');
 *   const isDesktop = useMediaQuery('(min-width: 1024px)');
 *   const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 *
 *   return <div>{isMobile ? 'Mobile' : 'Desktop'}</div>;
 * }
 * ```
 */

import { useSyncExternalStore } from 'react';

/**
 * Hook for media query matching
 *
 * @param query - Media query string (e.g., "(max-width: 768px)")
 * @returns Whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      // Ensure we're in browser environment
      if (typeof window === 'undefined' || !window.matchMedia) {
        return () => {};
      }

      const mediaQuery = window.matchMedia(query);
      // Use callback as the listener (it triggers re-render)
      mediaQuery.addEventListener('change', callback);
      return () => mediaQuery.removeEventListener('change', callback);
    },
    () => {
      // Get current snapshot
      if (typeof window === 'undefined' || !window.matchMedia) {
        return false;
      }
      return window.matchMedia(query).matches;
    },
    () => false, // SSR snapshot - always false to avoid hydration mismatch
  );
}

/**
 * Predefined breakpoint hooks based on Tailwind defaults
 */

/** Mobile (max-width: 768px) */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

/** Tablet (max-width: 992px) */
export function useIsTablet(): boolean {
  return useMediaQuery('(max-width: 992px)');
}

/** User prefers dark color scheme */
export function usePrefersColorSchemeDark(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/** User prefers reduced motion for accessibility */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

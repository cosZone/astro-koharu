/**
 * useIsDarkTheme Hook
 *
 * Hook for detecting the current page theme state by monitoring
 * the `dark` class on `document.documentElement`.
 *
 * Note: This is different from `usePrefersColorSchemeDark()` which
 * monitors the user's system preference. This hook monitors the actual
 * page theme which can be manually toggled by the user.
 *
 * @example
 * ```tsx
 * function Component() {
 *   const isDark = useIsDarkTheme();
 *   return <div>{isDark ? 'Dark Mode' : 'Light Mode'}</div>;
 * }
 * ```
 */

import { useEffect, useState } from 'react';

/**
 * Hook for detecting current page theme
 *
 * @returns Whether the page is currently in dark mode
 */
export function useIsDarkTheme(): boolean {
  const [isDark, setIsDark] = useState(() => {
    // SSR-safe initialization
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;

    // Sync with current state
    setIsDark(root.classList.contains('dark'));

    // Watch for class changes
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'));
    });

    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

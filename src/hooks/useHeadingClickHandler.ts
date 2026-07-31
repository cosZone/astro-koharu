/**
 * useHeadingClickHandler Hook
 *
 * Scrolls to the clicked TOC heading and reveals it in the accordion.
 *
 * @example
 * ```tsx
 * const onHeadingClick = useHeadingClickHandler({ revealTo });
 * ```
 */

import { lockHeadingTo } from '@lib/heading-scroll-lock';
import { useCallback } from 'react';

export interface UseHeadingClickHandlerOptions {
  /** Accordion reveal action from `useExpandedState` */
  revealTo: (id: string) => void;
}

export function useHeadingClickHandler({ revealTo }: UseHeadingClickHandlerOptions): (id: string) => void {
  return useCallback(
    (id: string) => {
      const element = document.getElementById(id);
      if (!element) return;

      // Pin the active heading until the smooth scroll settles
      lockHeadingTo(id);
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      revealTo(id);
    },
    [revealTo],
  );
}

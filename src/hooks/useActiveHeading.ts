/**
 * useActiveHeading Hook
 *
 * Tracks the ID of the heading currently under the offset line, for TOC
 * highlighting. Thin projection over the shared heading observer store.
 *
 * @example
 * ```tsx
 * const activeId = useActiveHeading({ offsetTop: 120 });
 * ```
 */

import { useSyncExternalStore } from 'react';
import { getHeadingObserverStore } from './headingObserverStore';

/** Every heading level, anywhere on the page */
const ALL_HEADINGS_SELECTOR = 'h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]';

export interface UseActiveHeadingOptions {
  /** Offset from top of viewport for detecting active heading (default: 120px for header) */
  offsetTop?: number;
}

/**
 * @param options - Active heading options
 * @returns ID of the currently active heading, or an empty string when none
 */
export function useActiveHeading({ offsetTop = 120 }: UseActiveHeadingOptions = {}): string {
  const store = getHeadingObserverStore({ selector: ALL_HEADINGS_SELECTOR, offsetTop });
  const heading = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  return heading?.id ?? '';
}

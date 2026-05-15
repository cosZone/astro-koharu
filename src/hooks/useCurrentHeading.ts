/**
 * useCurrentHeading Hook
 *
 * Tracks the current H2/H3 heading for the mobile post header.
 * Uses Intersection Observer to avoid forced reflows.
 * Uses useSyncExternalStore to avoid unnecessary re-renders.
 *
 * @example
 * ```tsx
 * function MobileHeader() {
 *   const heading = useCurrentHeading({ offsetTop: 80 });
 *   return heading ? <span>{heading.text}</span> : null;
 * }
 * ```
 */

import { getLockedHeadingId } from '@lib/heading-scroll-lock';
import { useMemo, useSyncExternalStore } from 'react';

export interface CurrentHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface UseCurrentHeadingOptions {
  /** Offset from top of viewport for detecting active heading (default: 80px) */
  offsetTop?: number;
}

/**
 * Creates a scroll store for tracking current heading using Intersection Observer
 * This avoids forced reflows by using async intersection callbacks
 */
function createHeadingStore(offsetTop: number) {
  let currentHeading: CurrentHeading | null = null;
  const listeners = new Set<() => void>();
  let observer: IntersectionObserver | null = null;
  const visibleHeadings = new Map<string, { top: number; element: HTMLElement }>(); // id -> { top, element }
  let cachedHeadings: HTMLElement[] = [];
  let pendingRaf: number | null = null;

  const notifyListeners = () => {
    listeners.forEach((listener) => {
      listener();
    });
  };

  // Update heading and notify listeners only if changed
  const updateHeading = (newHeading: CurrentHeading | null) => {
    if (currentHeading?.id !== newHeading?.id) {
      currentHeading = newHeading;
      notifyListeners();
    }
  };

  // Find the last heading that's been scrolled past (above the offset line)
  const findLastHeadingAboveOffset = (): CurrentHeading | null => {
    for (let i = cachedHeadings.length - 1; i >= 0; i--) {
      const heading = cachedHeadings[i];
      if (heading.getBoundingClientRect().top < offsetTop) {
        const level = parseInt(heading.tagName.substring(1), 10) as 2 | 3;
        return { id: heading.id, text: heading.textContent?.trim() || '', level };
      }
    }
    return null;
  };

  // Determine current heading from visible headings
  const updateCurrentHeading = () => {
    if (visibleHeadings.size === 0) {
      // No headings in the intersection zone — defer layout query to avoid forced reflow
      if (cachedHeadings.length === 0) {
        updateHeading(null);
        return;
      }
      if (pendingRaf !== null) return;
      pendingRaf = requestAnimationFrame(() => {
        pendingRaf = null;
        // Intersection events may have fired since we scheduled this frame
        if (visibleHeadings.size > 0) return;
        updateHeading(findLastHeadingAboveOffset());
      });
      return;
    }

    // Find the heading with the smallest top position (closest to top of viewport)
    let closestId = '';
    let closestTop = Number.POSITIVE_INFINITY;
    let closestElement: HTMLElement | null = null;

    for (const [id, { top, element }] of visibleHeadings) {
      if (top < closestTop) {
        closestTop = top;
        closestId = id;
        closestElement = element;
      }
    }

    if (closestElement && closestId) {
      const level = parseInt(closestElement.tagName.substring(1), 10) as 2 | 3;
      updateHeading({
        id: closestId,
        text: closestElement.textContent?.trim() || '',
        level,
      });
    }
  };

  // Setup Intersection Observer
  const setupObserver = () => {
    if (observer) {
      observer.disconnect();
    }

    visibleHeadings.clear();
    currentHeading = null;

    const article = document.querySelector('article');
    if (!article) {
      cachedHeadings = [];
      return;
    }

    // Root margin: negative top margin to account for header offset
    const rootMargin = `-${offsetTop}px 0px -70% 0px`;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          const id = element.id;
          if (!id) continue;

          if (entry.isIntersecting) {
            visibleHeadings.set(id, {
              top: entry.boundingClientRect.top,
              element,
            });
          } else {
            visibleHeadings.delete(id);
          }
        }

        // During programmatic scroll, lock to clicked heading to prevent flickering
        const locked = getLockedHeadingId();
        if (locked) {
          if (pendingRaf !== null) {
            cancelAnimationFrame(pendingRaf);
            pendingRaf = null;
          }
          const cached = visibleHeadings.get(locked);
          const element = cached?.element ?? cachedHeadings.find((h) => h.id === locked);
          if (!element) return;
          if (element.tagName === 'H2' || element.tagName === 'H3') {
            const level = parseInt(element.tagName.substring(1), 10) as 2 | 3;
            updateHeading({ id: locked, text: element.textContent?.trim() || '', level });
          }
          return;
        }
        updateCurrentHeading();
      },
      {
        rootMargin,
        threshold: 0,
      },
    );

    // Observe H2/H3 headings in article (excluding link preview blocks)
    const headings = article.querySelectorAll<HTMLElement>('h2:not(.link-preview-block h2), h3:not(.link-preview-block h3)');
    cachedHeadings = Array.from(headings).filter((h) => h.id);

    cachedHeadings.forEach((heading) => {
      observer?.observe(heading);
    });

    // IO doesn't fire for elements already scrolled past before observer setup
    if (cachedHeadings.length > 0 && visibleHeadings.size === 0) {
      requestAnimationFrame(() => {
        updateHeading(findLastHeadingAboveOffset());
      });
    }
  };

  // Handle Astro page transitions
  const handlePageLoad = () => {
    visibleHeadings.clear();
    currentHeading = null;
    requestAnimationFrame(() => {
      setupObserver();
    });
  };

  return {
    subscribe: (listener: () => void) => {
      // First listener - set up observer
      if (listeners.size === 0) {
        if (document.readyState !== 'loading') {
          setupObserver();
        }
        document.addEventListener('astro:page-load', handlePageLoad);
        document.addEventListener('content:decrypted', handlePageLoad);
      }

      listeners.add(listener);

      return () => {
        listeners.delete(listener);

        // Last listener - clean up
        if (listeners.size === 0) {
          if (observer) {
            observer.disconnect();
            observer = null;
          }
          document.removeEventListener('astro:page-load', handlePageLoad);
          document.removeEventListener('content:decrypted', handlePageLoad);
          if (pendingRaf !== null) {
            cancelAnimationFrame(pendingRaf);
            pendingRaf = null;
          }
          visibleHeadings.clear();
          cachedHeadings = [];
        }
      };
    },

    getSnapshot: () => currentHeading,

    // For SSR - return null
    getServerSnapshot: () => null,
  };
}

/**
 * Hook to track the current H2/H3 heading based on scroll position
 * Uses Intersection Observer for optimal performance - avoids forced reflows
 * Uses useSyncExternalStore - only re-renders when heading changes
 *
 * @param options - Options for heading detection
 * @returns Current heading info or null if not scrolled past any heading
 */
export function useCurrentHeading({ offsetTop = 80 }: UseCurrentHeadingOptions = {}): CurrentHeading | null {
  // Memoize store creation to avoid recreating on every render
  const store = useMemo(() => createHeadingStore(offsetTop), [offsetTop]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

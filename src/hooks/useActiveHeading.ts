/**
 * useActiveHeading Hook
 *
 * Tracks the currently active heading based on scroll position.
 * Uses Intersection Observer to avoid forced reflows.
 * Uses useSyncExternalStore to avoid unnecessary re-renders.
 *
 * @example
 * ```tsx
 * function TableOfContents() {
 *   const activeId = useActiveHeading({ offsetTop: 120 });
 *
 *   return (
 *     <nav>
 *       {headings.map(heading => (
 *         <a
 *           key={heading.id}
 *           className={activeId === heading.id ? 'active' : ''}
 *         >
 *           {heading.text}
 *         </a>
 *       ))}
 *     </nav>
 *   );
 * }
 * ```
 */

import { useMemo, useSyncExternalStore } from 'react';

export interface UseActiveHeadingOptions {
  /** Offset from top of viewport for detecting active heading (default: 120px for header) */
  offsetTop?: number;
}

/**
 * Creates a scroll store for tracking active heading ID using Intersection Observer
 * This avoids forced reflows by using async intersection callbacks
 */
function createActiveHeadingStore(offsetTop: number) {
  let activeId = '';
  const listeners = new Set<() => void>();
  let observer: IntersectionObserver | null = null;
  const visibleHeadings = new Map<string, number>(); // id -> top position when intersecting

  const notifyListeners = () => {
    listeners.forEach((listener) => {
      listener();
    });
  };

  // Determine active heading from visible headings
  const updateActiveHeading = () => {
    if (visibleHeadings.size === 0) return;

    // Find the heading with the smallest top position (closest to top of viewport)
    let closestId = '';
    let closestTop = Number.POSITIVE_INFINITY;

    visibleHeadings.forEach((top, id) => {
      if (top < closestTop) {
        closestTop = top;
        closestId = id;
      }
    });

    if (activeId !== closestId) {
      activeId = closestId;
      notifyListeners();
    }
  };

  // Setup Intersection Observer
  const setupObserver = () => {
    if (observer) {
      observer.disconnect();
    }

    visibleHeadings.clear();

    // Root margin: negative top margin to account for header offset
    // This creates an intersection zone starting below the header
    const rootMargin = `-${offsetTop}px 0px -70% 0px`;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (!id) continue;

          if (entry.isIntersecting) {
            // Track this heading as visible with its boundingClientRect.top
            // Using entry.boundingClientRect avoids forced reflow
            visibleHeadings.set(id, entry.boundingClientRect.top);
          } else {
            visibleHeadings.delete(id);
          }
        }
        updateActiveHeading();
      },
      {
        rootMargin,
        threshold: 0,
      },
    );

    // Observe all headings
    const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
    headings.forEach((heading) => {
      observer?.observe(heading);
    });

    // Initial check for headings already in view
    if (headings.length > 0 && visibleHeadings.size === 0) {
      // If no heading is intersecting, find the last heading above the viewport
      // Use requestAnimationFrame to batch read operations
      requestAnimationFrame(() => {
        const headingArray = Array.from(headings);
        for (let i = headingArray.length - 1; i >= 0; i--) {
          const heading = headingArray[i];
          const rect = heading.getBoundingClientRect();
          if (rect.top < offsetTop && heading.id) {
            if (activeId !== heading.id) {
              activeId = heading.id;
              notifyListeners();
            }
            break;
          }
        }
      });
    }
  };

  // Handle Astro page transitions
  const handlePageLoad = () => {
    activeId = '';
    visibleHeadings.clear();
    // Delay setup to ensure DOM is ready
    requestAnimationFrame(() => {
      setupObserver();
    });
  };

  return {
    subscribe: (listener: () => void) => {
      // First listener - set up observer
      if (listeners.size === 0) {
        setupObserver();
        document.addEventListener('astro:page-load', handlePageLoad);
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
          visibleHeadings.clear();
        }
      };
    },

    getSnapshot: () => activeId,

    // For SSR - return empty string
    getServerSnapshot: () => '',
  };
}

/**
 * Hook to track the currently active heading based on scroll position
 * Uses Intersection Observer for optimal performance - avoids forced reflows
 * Uses useSyncExternalStore - only re-renders when activeId changes
 *
 * @param options - Active heading options
 * @returns ID of the currently active heading
 */
export function useActiveHeading({ offsetTop = 120 }: UseActiveHeadingOptions = {}): string {
  // Memoize store creation to avoid recreating on every render
  const store = useMemo(() => createActiveHeadingStore(offsetTop), [offsetTop]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

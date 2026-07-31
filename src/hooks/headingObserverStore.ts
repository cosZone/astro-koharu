/**
 * Shared heading observer store
 *
 * One IntersectionObserver-backed external store per (scope, selector, offset)
 * triple, cached at module level so every consumer of the same configuration
 * subscribes to a single observer. The observer is created on the first
 * subscriber and disconnected when the last one leaves.
 *
 * Consumers are thin `useSyncExternalStore` projections — see `useActiveHeading`
 * and `useCurrentHeading`.
 */

import { getLockedHeadingId } from '@lib/heading-scroll-lock';
import type { ObservedHeading } from '@lib/toc';

export interface HeadingObserverStoreOptions {
  /** CSS selector for the headings to track */
  selector: string;
  /** Distance from the viewport top marking the "current heading" line */
  offsetTop: number;
  /** Optional container selector; when set and absent from the DOM, nothing is tracked */
  scopeSelector?: string;
}

export interface HeadingObserverStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ObservedHeading | null;
  getServerSnapshot: () => null;
}

const toObservedHeading = (element: HTMLElement): ObservedHeading => ({
  id: element.id,
  text: element.textContent?.trim() || '',
  level: parseInt(element.tagName.substring(1), 10),
});

function createHeadingObserverStore({ selector, offsetTop, scopeSelector }: HeadingObserverStoreOptions): HeadingObserverStore {
  let current: ObservedHeading | null = null;
  let observer: IntersectionObserver | null = null;
  let trackedHeadings: HTMLElement[] = [];
  let pendingRaf: number | null = null;
  const listeners = new Set<() => void>();
  const visible = new Map<string, { top: number; element: HTMLElement }>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const update = (next: ObservedHeading | null) => {
    if (current?.id === next?.id) return;
    current = next;
    notify();
  };

  const cancelPendingRaf = () => {
    if (pendingRaf === null) return;
    cancelAnimationFrame(pendingRaf);
    pendingRaf = null;
  };

  /** Every deferred frame goes through here so unsubscribe cleanup can cancel it */
  const scheduleRaf = (callback: () => void) => {
    cancelPendingRaf();
    pendingRaf = requestAnimationFrame(() => {
      pendingRaf = null;
      callback();
    });
  };

  /** Last heading already scrolled past — IO never fires for those */
  const findLastHeadingAboveOffset = (): ObservedHeading | null => {
    for (let i = trackedHeadings.length - 1; i >= 0; i--) {
      const heading = trackedHeadings[i];
      if (heading.getBoundingClientRect().top < offsetTop) return toObservedHeading(heading);
    }
    return null;
  };

  const resolveCurrent = () => {
    if (visible.size === 0) {
      if (trackedHeadings.length === 0) {
        update(null);
        return;
      }
      // Defer the layout read to the next frame to avoid a forced reflow
      if (pendingRaf !== null) return;
      scheduleRaf(() => {
        // Intersection events may have fired since this frame was scheduled
        if (visible.size > 0) return;
        update(findLastHeadingAboveOffset());
      });
      return;
    }

    let closest: HTMLElement | null = null;
    let closestTop = Number.POSITIVE_INFINITY;
    for (const { top, element } of visible.values()) {
      if (top < closestTop) {
        closestTop = top;
        closest = element;
      }
    }

    if (closest) update(toObservedHeading(closest));
  };

  const handleEntries = (entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      if (!element.id) continue;

      if (entry.isIntersecting) {
        visible.set(element.id, { top: entry.boundingClientRect.top, element });
      } else {
        visible.delete(element.id);
      }
    }

    // During programmatic scroll, pin to the clicked heading to prevent flickering.
    // The lock is global, so an id outside this store's selector scope must still resolve normally.
    const locked = getLockedHeadingId();
    if (locked) {
      const element = visible.get(locked)?.element ?? trackedHeadings.find((heading) => heading.id === locked);
      if (element) {
        cancelPendingRaf();
        update(toObservedHeading(element));
        return;
      }
    }

    resolveCurrent();
  };

  const setupObserver = () => {
    observer?.disconnect();
    visible.clear();
    update(null);

    const scope = scopeSelector ? document.querySelector(scopeSelector) : document;
    if (!scope) {
      trackedHeadings = [];
      return;
    }

    observer = new IntersectionObserver(handleEntries, {
      // Negative top margin accounts for the header, so the intersection zone
      // starts at the offset line; the bottom margin keeps it a thin band.
      rootMargin: `-${offsetTop}px 0px -70% 0px`,
      threshold: 0,
    });

    trackedHeadings = Array.from(scope.querySelectorAll<HTMLElement>(selector)).filter((heading) => heading.id);
    for (const heading of trackedHeadings) observer.observe(heading);

    if (trackedHeadings.length > 0 && visible.size === 0) {
      scheduleRaf(() => update(findLastHeadingAboveOffset()));
    }
  };

  const handlePageLoad = () => {
    visible.clear();
    update(null);
    scheduleRaf(setupObserver);
  };

  return {
    subscribe: (listener: () => void) => {
      if (listeners.size === 0) {
        if (document.readyState !== 'loading') setupObserver();
        document.addEventListener('astro:page-load', handlePageLoad);
        document.addEventListener('content:decrypted', handlePageLoad);
      }

      listeners.add(listener);

      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;

        observer?.disconnect();
        observer = null;
        document.removeEventListener('astro:page-load', handlePageLoad);
        document.removeEventListener('content:decrypted', handlePageLoad);
        cancelPendingRaf();
        visible.clear();
        trackedHeadings = [];
        current = null;
      };
    },
    getSnapshot: () => current,
    getServerSnapshot: () => null,
  };
}

const stores = new Map<string, HeadingObserverStore>();

/**
 * Module-level cached store lookup. Deliberately not `useMemo` — React may drop
 * a memo at any time, which would silently split subscribers across observers.
 */
export function getHeadingObserverStore(options: HeadingObserverStoreOptions): HeadingObserverStore {
  const key = `${options.scopeSelector ?? ''}|${options.selector}|${options.offsetTop}`;
  let store = stores.get(key);
  if (!store) {
    store = createHeadingObserverStore(options);
    stores.set(key, store);
  }
  return store;
}

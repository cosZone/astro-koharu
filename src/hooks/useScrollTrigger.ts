/**
 * useScrollTrigger Hook
 *
 * Detects scroll position and direction for UI visibility control.
 * Optimized using useSyncExternalStore to prevent unnecessary re-renders.
 *
 * @example
 * ```tsx
 * function Header() {
 *   const { isBeyond, direction, scrollY } = useScrollTrigger({
 *     triggerDistance: 0.45, // 45% of viewport height
 *   });
 *
 *   return (
 *     <header className={cn(
 *       direction === 'down' && '-translate-y-full',
 *       isBeyond && 'bg-background'
 *     )}>
 *       ...
 *     </header>
 *   );
 * }
 * ```
 */

import { useMemo, useSyncExternalStore } from 'react';

export interface UseScrollTriggerOptions {
  /**
   * Distance to trigger (as viewport height fraction or pixel value)
   * @default 0.45 (45% of viewport height)
   */
  triggerDistance?: number;

  /**
   * If true, triggerDistance is treated as pixels, otherwise as viewport fraction
   * @default false
   */
  isPixels?: boolean;

  /**
   * Throttle interval in milliseconds
   * @default 80
   */
  throttleMs?: number;

  /**
   * Skip first scroll event (useful for page load)
   * @default true
   */
  skipFirstScroll?: boolean;
}

export interface ScrollTriggerState {
  /** Current scroll Y position */
  scrollY: number;
  /** Whether scrolled past trigger distance */
  isBeyond: boolean;
  /** Scroll direction: 'up' | 'down' | 'none' */
  direction: 'up' | 'down' | 'none';
  /** Whether scrolling is active (vs idle) */
  isScrolling: boolean;
}

// Cached server snapshot to avoid infinite loop
const SERVER_SNAPSHOT: ScrollTriggerState = {
  scrollY: 0,
  isBeyond: false,
  direction: 'none',
  isScrolling: false,
};

function createScrollStore(options: UseScrollTriggerOptions = {}) {
  const { triggerDistance = 0.45, isPixels = false, throttleMs = 80, skipFirstScroll = true } = options;

  let state: ScrollTriggerState = {
    scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
    isBeyond: false,
    direction: 'none',
    isScrolling: false,
  };

  let lastScrollY = state.scrollY;
  let firstScroll = skipFirstScroll;
  const listeners = new Set<() => void>();
  let lastRan = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let scrollEndTimer: ReturnType<typeof setTimeout> | null = null;

  const getThreshold = () =>
    isPixels ? triggerDistance : (typeof window !== 'undefined' ? window.innerHeight : 800) * triggerDistance;

  const updateState = (newState: Partial<ScrollTriggerState>) => {
    const prevState = state;
    state = { ...state, ...newState };

    // Only notify if state actually changed
    if (
      prevState.scrollY !== state.scrollY ||
      prevState.isBeyond !== state.isBeyond ||
      prevState.direction !== state.direction ||
      prevState.isScrolling !== state.isScrolling
    ) {
      for (const listener of listeners) {
        listener();
      }
    }
  };

  const handleScroll = () => {
    const currentScrollY = window.scrollY;
    const threshold = getThreshold();
    const isBeyond = currentScrollY > threshold;

    // Handle first scroll skip
    if (firstScroll) {
      firstScroll = false;
      updateState({ scrollY: currentScrollY, isBeyond, isScrolling: true });
      lastScrollY = currentScrollY;
      return;
    }

    // Determine direction
    let direction: 'up' | 'down' | 'none' = 'none';
    if (currentScrollY > lastScrollY) {
      direction = 'down';
    } else if (currentScrollY < lastScrollY) {
      direction = 'up';
    }

    // Clear previous scroll end timer
    if (scrollEndTimer) {
      clearTimeout(scrollEndTimer);
    }

    // Set scroll end detection
    scrollEndTimer = setTimeout(() => {
      updateState({ isScrolling: false });
    }, 150);

    updateState({
      scrollY: currentScrollY,
      isBeyond,
      direction,
      isScrolling: true,
    });

    lastScrollY = currentScrollY;
  };

  const throttledHandleScroll = () => {
    const now = Date.now();
    if (now - lastRan >= throttleMs) {
      handleScroll();
      lastRan = now;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(
        () => {
          if (Date.now() - lastRan >= throttleMs) {
            handleScroll();
            lastRan = Date.now();
          }
        },
        throttleMs - (now - lastRan),
      );
    }
  };

  return {
    subscribe: (listener: () => void) => {
      // Only add scroll listener when first subscriber
      if (listeners.size === 0 && typeof window !== 'undefined') {
        // Initialize state
        const currentScrollY = window.scrollY;
        const threshold = getThreshold();
        state = {
          scrollY: currentScrollY,
          isBeyond: currentScrollY > threshold,
          direction: 'none',
          isScrolling: false,
        };
        lastScrollY = currentScrollY;
        firstScroll = skipFirstScroll;

        window.addEventListener('scroll', throttledHandleScroll, { passive: true });
      }

      listeners.add(listener);

      return () => {
        listeners.delete(listener);

        // Remove scroll listener when no subscribers
        if (listeners.size === 0 && typeof window !== 'undefined') {
          window.removeEventListener('scroll', throttledHandleScroll);
          if (timeoutId) clearTimeout(timeoutId);
          if (scrollEndTimer) clearTimeout(scrollEndTimer);
        }
      };
    },
    getSnapshot: () => state,
    getServerSnapshot: () => SERVER_SNAPSHOT,
  };
}

export function useScrollTrigger(options: UseScrollTriggerOptions = {}): ScrollTriggerState {
  const { triggerDistance, isPixels, throttleMs, skipFirstScroll } = options;

  const store = useMemo(
    () => createScrollStore({ triggerDistance, isPixels, throttleMs, skipFirstScroll }),
    [triggerDistance, isPixels, throttleMs, skipFirstScroll],
  );

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

/**
 * Simple hook to get current scroll position
 * Uses same optimized pattern as useScrollTrigger
 */
export function useScrollY(): number {
  const { scrollY } = useScrollTrigger({ skipFirstScroll: false });
  return scrollY;
}

/**
 * Hook to detect if scrolled past a threshold
 */
export function useScrolledPast(threshold: number, isPixels = true): boolean {
  const { isBeyond } = useScrollTrigger({
    triggerDistance: threshold,
    isPixels,
    skipFirstScroll: false,
  });
  return isBeyond;
}

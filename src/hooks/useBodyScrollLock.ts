/**
 * useBodyScrollLock Hook
 *
 * Locks/unlocks body scroll when modals or drawers are open.
 * Handles iOS-specific quirks and cleanup on unmount.
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, children }) {
 *   useBodyScrollLock(isOpen);
 *
 *   if (!isOpen) return null;
 *   return <div className="modal">{children}</div>;
 * }
 * ```
 */

import { useEffect, useRef } from 'react';

export interface UseBodyScrollLockOptions {
  /**
   * Whether to lock scroll
   */
  lock: boolean;

  /**
   * Preserve scroll position when unlocking
   * @default true
   */
  preserveScrollPosition?: boolean;
}

/**
 * Lock body scroll with automatic cleanup
 */
export function useBodyScrollLock(lockOrOptions: boolean | UseBodyScrollLockOptions): void {
  const options = typeof lockOrOptions === 'boolean' ? { lock: lockOrOptions } : lockOrOptions;

  const { lock, preserveScrollPosition = true } = options;

  const scrollPositionRef = useRef(0);
  const originalStyleRef = useRef<string>('');

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (lock) {
      // Save current scroll position and original style
      scrollPositionRef.current = window.scrollY;
      originalStyleRef.current = document.body.style.overflow;

      // Lock scroll
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore scroll on cleanup
        document.body.style.overflow = originalStyleRef.current;

        if (preserveScrollPosition) {
          window.scrollTo(0, scrollPositionRef.current);
        }
      };
    }
    // If not locked, ensure scroll is unlocked
    if (document.body.style.overflow === 'hidden') {
      document.body.style.overflow = originalStyleRef.current || '';
    }
  }, [lock, preserveScrollPosition]);
}

/**
 * Imperative functions for body scroll lock
 * Useful for non-React code or global state management
 */
export const bodyScrollLock = {
  lock: () => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  },

  unlock: () => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  },

  isLocked: () => {
    if (typeof document !== 'undefined') {
      return document.body.style.overflow === 'hidden';
    }
    return false;
  },
};

export default useBodyScrollLock;

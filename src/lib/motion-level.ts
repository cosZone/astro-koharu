/**
 * Effective motion level for islands and vanilla scripts.
 *
 * `<html data-motion>` is written before first paint by BootScripts and kept in sync by the
 * settings store, so the DOM attribute (not the store) is the runtime source of truth.
 * The OS reduced-motion preference always caps the result at `reduced`.
 */

import { isMotionLevel } from '@lib/config/motion';
import type { MotionLevel } from '@lib/config/types';
import { REDUCED_MOTION_QUERY } from '@store/settings-constants';

let mediaQuery: MediaQueryList | undefined;
let observer: MutationObserver | undefined;
const listeners = new Set<() => void>();

function getMediaQuery(): MediaQueryList | undefined {
  if (typeof window === 'undefined') return;
  mediaQuery ??= window.matchMedia(REDUCED_MOTION_QUERY);
  return mediaQuery;
}

export function readMotionLevel(): MotionLevel {
  if (typeof document === 'undefined') return 'reduced';
  if (getMediaQuery()?.matches) return 'reduced';
  const level = document.documentElement.dataset.motion;
  return isMotionLevel(level) ? level : 'lively';
}

function notify(): void {
  // Changing transition-duration does not retime transitions already in progress.
  if (readMotionLevel() === 'reduced' && typeof CSSTransition !== 'undefined') {
    for (const animation of document.getAnimations()) {
      if (animation instanceof CSSTransition) animation.finish();
    }
  }
  for (const listener of listeners) listener();
}

export function subscribeMotionLevel(onChange: () => void): () => void {
  listeners.add(onChange);
  if (listeners.size === 1) {
    observer = new MutationObserver(notify);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    getMediaQuery()?.addEventListener('change', notify);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = undefined;
      getMediaQuery()?.removeEventListener('change', notify);
    }
  };
}

export function isMotionDisabled(): boolean {
  return readMotionLevel() === 'reduced';
}

export function getScrollBehavior(): ScrollBehavior {
  return isMotionDisabled() ? 'instant' : 'smooth';
}

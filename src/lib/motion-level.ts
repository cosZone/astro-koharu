/**
 * Effective motion level for islands and vanilla scripts.
 *
 * `<html data-motion>` is written before first paint by BootScripts and kept in sync by the
 * settings store, so the DOM attribute (not the store) is the runtime source of truth.
 * The OS reduced-motion preference always caps the result at `reduced`.
 */

import { isMotionLevel } from '@lib/config/motion';
import type { MotionLevel } from '@lib/config/types';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function readMotionLevel(): MotionLevel {
  if (typeof document === 'undefined') return 'reduced';
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return 'reduced';
  const level = document.documentElement.dataset.motion;
  return isMotionLevel(level) ? level : 'lively';
}

export function subscribeMotionLevel(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => {
    observer.disconnect();
    query.removeEventListener('change', onChange);
  };
}

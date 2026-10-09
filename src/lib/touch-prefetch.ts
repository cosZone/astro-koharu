/**
 * Prefetches a link when a finger rests on it. The site prefetches on hover so visible links do not
 * compete with a cold load, but touch screens only emulate hover right before the click, which leaves
 * phones without any head start. A short hold filters out scrolls that merely start on a link (most
 * of a post list is links); a tap still leaves enough time before its click to start the request.
 */

import { prefetch } from 'astro:prefetch';

const HOLD_MS = 50;

let timer = 0;

function cancel(): void {
  window.clearTimeout(timer);
  timer = 0;
}

function handleTouchStart(event: TouchEvent): void {
  cancel();
  if (event.touches.length !== 1) return;
  const anchor = (event.target as Element | null)?.closest?.('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.dataset.astroPrefetch === 'false' || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
  // Astro skips cross-origin, current-page and already prefetched URLs, and slow connections.
  timer = window.setTimeout(() => prefetch(anchor.href), HOLD_MS);
}

let installed = false;

export function setupTouchPrefetch(): void {
  if (installed) return;
  installed = true;
  const options = { capture: true, passive: true };
  document.addEventListener('touchstart', handleTouchStart, options);
  document.addEventListener('touchmove', cancel, options);
  document.addEventListener('touchcancel', cancel, options);
}

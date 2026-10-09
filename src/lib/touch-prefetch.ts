/**
 * Prefetches a link when a finger lands on it. The site prefetches on hover so visible links do not
 * compete with a cold load, but touch screens only emulate hover right before the click, which leaves
 * phones without any head start. The press-to-release gap is usually enough to start the request.
 */

import { prefetch } from 'astro:prefetch';

function prefetchTouchedLink(event: TouchEvent): void {
  const anchor = (event.target as Element | null)?.closest?.('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.dataset.astroPrefetch === 'false' || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
  // Astro skips cross-origin, current-page and already prefetched URLs, and slow connections.
  prefetch(anchor.href);
}

let installed = false;

export function setupTouchPrefetch(): void {
  if (installed) return;
  installed = true;
  document.addEventListener('touchstart', prefetchTouchedLink, { capture: true, passive: true });
}

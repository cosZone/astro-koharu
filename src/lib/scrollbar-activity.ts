/**
 * Marks a region with `data-scroll-active` while it scrolls, and the page while the mouse nears the
 * right edge where its scrollbar lives, until things have been still for a moment. That is when the
 * silk-thread scrollbar lights up (see src/styles/global/scrollbar.css). Scroll events do not bubble,
 * hence one capturing listener for the page and every scroll container in it.
 */

const IDLE_MS = 900;
const EDGE_PX = 24;

const timers = new WeakMap<Element, number>();

function wake(region: Element): void {
  if (!region.hasAttribute('data-scroll-active')) region.setAttribute('data-scroll-active', '');
  window.clearTimeout(timers.get(region));
  timers.set(
    region,
    window.setTimeout(() => region.removeAttribute('data-scroll-active'), IDLE_MS),
  );
}

function onScroll(event: Event): void {
  const region = event.target === document ? document.documentElement : event.target;
  if (region instanceof Element) wake(region);
}

function onPointerMove(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && window.innerWidth - event.clientX <= EDGE_PX) wake(document.documentElement);
}

export function setupScrollbarActivity(): void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  document.addEventListener('pointermove', onPointerMove, { passive: true });
}

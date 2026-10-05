import { readMotionLevel, subscribeMotionLevel } from '@lib/motion-level';

let dispose: (() => void) | undefined;

function init() {
  dispose?.();
  const grid = document.querySelector<HTMLElement>('[data-friends-grid]');
  if (!grid) return;

  const controller = new AbortController();
  const { signal } = controller;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let active: HTMLElement | null = null;
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let bounds: DOMRect | undefined;

  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (active) {
      active.style.removeProperty('--rx');
      active.style.removeProperty('--ry');
      active.style.removeProperty('--mx');
      active.style.removeProperty('--my');
      delete active.dataset.tilting;
    }
    active = null;
    bounds = undefined;
  };

  grid.addEventListener(
    'pointermove',
    (event) => {
      if (!finePointer.matches || readMotionLevel() !== 'lively' || event.pointerType !== 'mouse') return;
      const card = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-friend-card]') : null;
      if (!card) {
        reset();
        return;
      }
      if (active !== card) {
        reset();
        active = card;
        bounds = card.getBoundingClientRect();
      }
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!active || !bounds) return;
        const x = Math.max(0, Math.min(1, (pointerX - bounds.left) / bounds.width));
        const y = Math.max(0, Math.min(1, (pointerY - bounds.top) / bounds.height));
        active.style.setProperty('--rx', `${(0.5 - y) * 12}deg`);
        active.style.setProperty('--ry', `${(x - 0.5) * 12}deg`);
        active.style.setProperty('--mx', `${x * 100}%`);
        active.style.setProperty('--my', `${y * 100}%`);
        active.dataset.tilting = '';
      });
    },
    { signal },
  );
  grid.addEventListener('pointerleave', reset, { signal });
  window.addEventListener('scroll', reset, { signal, passive: true });
  window.addEventListener('resize', reset, { signal, passive: true });
  finePointer.addEventListener('change', reset, { signal });
  const unsubscribeMotion = subscribeMotionLevel(reset);

  const fallbackAvatar = (image: HTMLImageElement) => {
    // Keep the original SVG face under the image, including failures before this script loads.
    image.hidden = true;
  };
  grid.addEventListener(
    'error',
    (event) => {
      if (event.target instanceof HTMLImageElement && event.target.hasAttribute('data-friend-avatar')) {
        fallbackAvatar(event.target);
      }
    },
    { capture: true, signal },
  );
  for (const image of grid.querySelectorAll<HTMLImageElement>('[data-friend-avatar]')) {
    if (image.complete && image.naturalWidth === 0) fallbackAvatar(image);
  }

  dispose = () => {
    reset();
    controller.abort();
    unsubscribeMotion();
  };
}

if (document.readyState !== 'loading') init();
document.addEventListener('astro:page-load', init);
document.addEventListener('astro:before-swap', () => {
  dispose?.();
  dispose = undefined;
});

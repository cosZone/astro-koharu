import { readMotionLevel } from '@lib/motion-level';

let dispose: (() => void) | undefined;

/**
 * Group tabs filter sections in place; the URL is left alone so the ClientRouter keeps owning history
 * (a shared `#friends-<group>` link still opens with that group). Broken avatars fall back to the SVG face.
 */
function init() {
  dispose?.();
  const grid = document.querySelector<HTMLElement>('[data-friends-grid]');
  if (!grid) return;

  const controller = new AbortController();
  grid.addEventListener(
    'error',
    (event) => {
      if (event.target instanceof HTMLImageElement && event.target.hasAttribute('data-friend-avatar')) {
        event.target.hidden = true;
      }
    },
    { capture: true, signal: controller.signal },
  );
  // Images that failed before this script loaded never fire another error event.
  for (const image of grid.querySelectorAll<HTMLImageElement>('[data-friend-avatar]')) {
    if (image.complete && image.naturalWidth === 0) image.hidden = true;
  }

  const tabs = [...grid.querySelectorAll<HTMLButtonElement>('[data-friends-filter]')];
  const sections = [...grid.querySelectorAll<HTMLElement>('[data-friends-section]')];
  const select = (id: string) => {
    const filtered = id !== 'all';
    if (filtered) grid.dataset.friendsActive = id;
    else delete grid.dataset.friendsActive;
    for (const section of sections) section.hidden = filtered && section.dataset.friendsSection !== id;
    for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.friendsFilter === id));
    if (readMotionLevel() !== 'reduced') {
      for (const section of sections) {
        if (!section.hidden) section.animate({ opacity: [0, 1] }, { duration: 180, easing: 'ease-out' });
      }
    }
  };
  grid.addEventListener(
    'click',
    (event) => {
      const tab = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-friends-filter]') : null;
      if (tab?.dataset.friendsFilter) select(tab.dataset.friendsFilter);
    },
    { signal: controller.signal },
  );
  // A shared `#friends-<group>` link opens with that group selected.
  const linked = sections.find((section) => `#${section.id}` === window.location.hash);
  if (linked?.dataset.friendsSection) select(linked.dataset.friendsSection);

  dispose = () => controller.abort();
}

if (document.readyState !== 'loading') init();
document.addEventListener('astro:page-load', init);
document.addEventListener('astro:before-swap', () => {
  dispose?.();
  dispose = undefined;
});

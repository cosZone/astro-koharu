let dispose: (() => void) | undefined;

/**
 * Group tabs are plain anchors to each section; here they become an instant filter. The URL is left
 * alone so the ClientRouter keeps owning history. Broken avatars are hidden so the SVG face shows.
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

  const tabs = [...grid.querySelectorAll<HTMLAnchorElement>('[data-friends-filter]')];
  const sections = [...grid.querySelectorAll<HTMLElement>('[data-friends-section]')];
  const select = (id: string) => {
    const filtered = id !== 'all';
    if (filtered) grid.dataset.friendsActive = id;
    else delete grid.dataset.friendsActive;
    for (const section of sections) section.hidden = filtered && section.dataset.friendsSection !== id;
    for (const tab of tabs) {
      if (tab.dataset.friendsFilter === id) tab.setAttribute('aria-current', 'true');
      else tab.removeAttribute('aria-current');
    }
  };
  grid.addEventListener(
    'click',
    (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const tab = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('[data-friends-filter]') : null;
      if (!tab?.dataset.friendsFilter) return;
      event.preventDefault();
      select(tab.dataset.friendsFilter);
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

let dispose: (() => void) | undefined;

/** Broken friend avatars are hidden so the SVG face underneath shows through. */
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

  dispose = () => controller.abort();
}

if (document.readyState !== 'loading') init();
document.addEventListener('astro:page-load', init);
document.addEventListener('astro:before-swap', () => {
  dispose?.();
  dispose = undefined;
});

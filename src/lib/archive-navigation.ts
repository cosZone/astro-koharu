import { navigate } from 'astro:transitions/client';
import { getScrollBehavior } from '@lib/motion-level';

export function setupArchiveNavigation(): void {
  let dispose: (() => void) | undefined;
  function init(): void {
    dispose?.();
    const archive = document.querySelector<HTMLElement>('[data-archive]');
    if (!archive) return;
    const controller = new AbortController();
    archive.addEventListener(
      'click',
      async (event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          !(event.target instanceof Element)
        )
          return;
        const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
        const target = link?.hash && document.getElementById(link.hash.slice(1));
        if (!link || !target) return;
        event.preventDefault();
        // The ClientRouter owns history indices and scroll restoration across pages.
        await navigate(link.hash, { sourceElement: link });
        if (controller.signal.aborted || !target.isConnected) return;
        target.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
        target.focus({ preventScroll: true });
      },
      { signal: controller.signal },
    );
    dispose = () => controller.abort();
  }
  if (document.readyState !== 'loading') init();
  document.addEventListener('astro:page-load', init);
  document.addEventListener('astro:before-swap', () => {
    dispose?.();
    dispose = undefined;
  });
}

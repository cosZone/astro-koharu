import { getScrollBehavior } from '@lib/motion-level';

export function setupArchiveNavigation(): void {
  let dispose: (() => void) | undefined;
  function init(): void {
    dispose?.();
    const archive = document.querySelector<HTMLElement>('[data-archive]');
    if (!archive) return;
    const controller = new AbortController();
    const links = [...archive.querySelectorAll<HTMLAnchorElement>('[data-year-jump]')];
    const years = [...archive.querySelectorAll<HTMLElement>('[data-archive-year]')];
    const mark = (id: string) => {
      for (const link of links) {
        if (link.hash === `#${id}`) link.setAttribute('aria-current', 'date');
        else link.removeAttribute('aria-current');
      }
    };
    let frame = 0;
    const update = () => {
      frame = 0;
      const current = years.findLast((year) => year.getBoundingClientRect().top <= 100) ?? years[0];
      if (current) mark(current.id);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, { passive: true, signal: controller.signal });
    window.addEventListener('resize', schedule, { signal: controller.signal });
    update();
    archive.addEventListener(
      'click',
      (event) => {
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
        history.pushState(null, '', link.hash);
        target.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
        target.focus({ preventScroll: true });
        mark(target.closest<HTMLElement>('[data-archive-year]')?.id ?? target.id);
      },
      { signal: controller.signal },
    );
    dispose = () => {
      cancelAnimationFrame(frame);
      controller.abort();
    };
  }
  if (document.readyState !== 'loading') init();
  document.addEventListener('astro:page-load', init);
  document.addEventListener('astro:before-swap', () => {
    dispose?.();
    dispose = undefined;
  });
}

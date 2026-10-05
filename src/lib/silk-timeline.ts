import { readMotionLevel, subscribeMotionLevel } from '@lib/motion-level';

/** One delegated listener set and one persistent petal per timeline, including custom slot rows. */
export function setupSilkTimelines(): void {
  let dispose: (() => void) | undefined;
  function init(): void {
    dispose?.();
    if (!document.querySelector('[data-silk-timeline]')) return;
    const controller = new AbortController();
    const { signal } = controller;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let active: HTMLElement | undefined;
    const hide = () => {
      active?.closest<HTMLElement>('[data-silk-timeline]')?.removeAttribute('data-silk-active');
      active?.removeAttribute('data-silk-current');
      active = undefined;
    };
    const show = (event: Event) => {
      if (!finePointer.matches || readMotionLevel() === 'reduced' || !(event.target instanceof Element)) return;
      const row = event.target.closest<HTMLElement>('[data-silk-row]');
      const timeline = row?.closest<HTMLElement>('[data-silk-timeline]');
      if (!row || !timeline || row === active) return;
      hide();
      const petal = timeline.querySelector<HTMLElement>('.silk-petal');
      if (!petal) return;
      const beadY = Number.parseFloat(getComputedStyle(row).getPropertyValue('--silk-bead-y'));
      const y = row.getBoundingClientRect().top - timeline.getBoundingClientRect().top + beadY - 6;
      petal.style.transform = `translateY(${y}px)`;
      timeline.dataset.silkActive = '';
      row.dataset.silkCurrent = '';
      active = row;
    };
    const leave = (event: PointerEvent | FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const timeline = event.target.closest('[data-silk-timeline]');
      if (timeline && (!(event.relatedTarget instanceof Node) || !timeline.contains(event.relatedTarget))) hide();
    };
    document.addEventListener('pointerover', show, { signal });
    document.addEventListener('focusin', show, { signal });
    document.addEventListener('pointerout', leave, { signal });
    document.addEventListener('focusout', leave, { signal });
    const unsubscribe = subscribeMotionLevel(() => {
      if (readMotionLevel() === 'reduced') hide();
    });
    finePointer.addEventListener('change', hide, { signal });
    dispose = () => {
      hide();
      controller.abort();
      unsubscribe();
    };
  }
  if (document.readyState !== 'loading') init();
  document.addEventListener('astro:page-load', init);
  document.addEventListener('astro:before-swap', () => {
    dispose?.();
    dispose = undefined;
  });
}

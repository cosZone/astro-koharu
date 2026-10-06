import { readMotionLevel } from '@lib/motion-level';

/** Category sub-tabs switch the list in place: rows outside the chosen branch hide, years recount. */
export function setupCategoryFilter(): void {
  let dispose: (() => void) | undefined;
  function init(): void {
    dispose?.();
    const root = document.querySelector<HTMLElement>('[data-category-filter-root]');
    const tabs = [...(root?.querySelectorAll<HTMLButtonElement>('[data-category-filter]') ?? [])];
    if (!root || !tabs.length) return;
    const controller = new AbortController();
    const years = [...root.querySelectorAll<HTMLElement>('[data-post-year]')];
    const list = root.querySelector<HTMLElement>('.post-years');
    const select = (key: string) => {
      for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.categoryFilter === key));
      for (const year of years) {
        let visible = 0;
        for (const row of year.querySelectorAll<HTMLElement>('.post-row')) {
          row.hidden = key !== '' && row.dataset.filterKey !== key;
          if (!row.hidden) visible++;
        }
        year.hidden = visible === 0;
        const count = year.querySelector<HTMLElement>('[data-count-template]');
        if (count) count.textContent = count.dataset.countTemplate?.replace('#', String(visible)) ?? '';
      }
      if (list && readMotionLevel() !== 'reduced') {
        list.animate({ opacity: [0, 1] }, { duration: 180, easing: 'ease-out' });
      }
    };
    root.addEventListener(
      'click',
      (event) => {
        const tab = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-category-filter]') : null;
        if (tab?.dataset.categoryFilter !== undefined) select(tab.dataset.categoryFilter);
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

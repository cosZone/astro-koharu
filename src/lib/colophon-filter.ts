import { resolveMarkFilter, rowHasMark } from '@lib/content/colophon-view';
import { readMotionLevel } from '@lib/motion-level';

const PARAM = 'mark';

function writeMarkParam(mark: string): void {
  const url = new URL(window.location.href);
  if (mark) url.searchParams.set(PARAM, mark);
  else url.searchParams.delete(PARAM);
  // Keep the ClientRouter's history state (index, scroll) on the current entry.
  window.history.replaceState(window.history.state, '', url);
}

/**
 * Archive mark filter: `?mark=<id>` keeps rows whose `data-colophon` carries the mark and recounts years.
 * Without JS the full list stays visible.
 */
export function setupColophonFilter(): void {
  let dispose: (() => void) | undefined;
  function init(): void {
    dispose?.();
    const root = document.querySelector<HTMLElement>('[data-colophon-filter-root]');
    const chips = [...(root?.querySelectorAll<HTMLButtonElement>('[data-colophon-filter]') ?? [])];
    if (!root || !chips.length) return;
    const controller = new AbortController();
    const available = chips.map((chip) => chip.dataset.colophonFilter ?? '').filter(Boolean);
    const years = [...root.querySelectorAll<HTMLElement>('[data-post-year]')];
    const list = root.querySelector<HTMLElement>('.post-years');
    let current = '';

    const apply = (mark: string, animate: boolean) => {
      current = mark;
      for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.dataset.colophonFilter === mark));
      for (const year of years) {
        let visible = 0;
        for (const row of year.querySelectorAll<HTMLElement>('.post-row')) {
          row.hidden = !rowHasMark(row.dataset.colophon, mark);
          if (!row.hidden) visible++;
        }
        year.hidden = visible === 0;
        const count = year.querySelector<HTMLElement>('[data-count-template]');
        if (count) count.textContent = count.dataset.countTemplate?.replace('#', String(visible)) ?? '';
      }
      if (animate && list && readMotionLevel() !== 'reduced') {
        list.animate({ opacity: [0, 1] }, { duration: 180, easing: 'ease-out' });
      }
    };

    apply(resolveMarkFilter(new URLSearchParams(window.location.search).get(PARAM), available), false);

    root.addEventListener(
      'click',
      (event) => {
        if (!(event.target instanceof Element)) return;
        const chip = event.target.closest<HTMLButtonElement>('[data-colophon-filter]');
        if (chip) {
          const id = chip.dataset.colophonFilter ?? '';
          const next = id === current ? '' : id;
          apply(next, true);
          writeMarkParam(next);
          return;
        }
        // Calendar links jump to month rows; clear the filter first if it hid the target.
        const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
        const target = current && link?.hash ? document.getElementById(link.hash.slice(1)) : null;
        if (target?.closest('[hidden]')) {
          apply('', false);
          writeMarkParam('');
        }
      },
      // Capture runs before the archive navigation's bubbling handler scrolls to the target.
      { capture: true, signal: controller.signal },
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

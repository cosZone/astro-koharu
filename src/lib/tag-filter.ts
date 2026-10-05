export function setupTagFilter(): void {
  let dispose: (() => void) | undefined;
  function init(): void {
    dispose?.();
    const cloud = document.querySelector<HTMLElement>('[data-tag-cloud]');
    const input = cloud?.querySelector<HTMLInputElement>('[data-tag-filter]');
    if (!cloud || !input) return;
    const controller = new AbortController();
    const tags = [...cloud.querySelectorAll<HTMLElement>('[data-tag]')];
    const singles = cloud.querySelector<HTMLDetailsElement>('details');
    const empty = cloud.querySelector<HTMLElement>('[data-tag-empty]');
    let filtering = false;
    let previouslyOpen = singles?.open ?? false;
    const filter = () => {
      const query = input.value.trim().toLowerCase();
      if (query && !filtering) previouslyOpen = singles?.open ?? false;
      let visible = 0;
      let visibleSingles = 0;
      for (const tag of tags) {
        tag.hidden = !tag.dataset.tag?.includes(query);
        if (!tag.hidden) {
          visible++;
          if (singles?.contains(tag)) visibleSingles++;
        }
      }
      if (singles) {
        singles.hidden = Boolean(query) && visibleSingles === 0;
        singles.open = query ? visibleSingles > 0 : previouslyOpen;
      }
      if (empty) empty.hidden = visible > 0;
      filtering = Boolean(query);
    };
    cloud.addEventListener('input', filter, { signal: controller.signal });
    filter();
    dispose = () => controller.abort();
  }
  if (document.readyState !== 'loading') init();
  document.addEventListener('astro:page-load', init);
  document.addEventListener('astro:before-swap', () => {
    dispose?.();
    dispose = undefined;
  });
}

/**
 * Keeps the site header one continuous object across ClientRouter navigations.
 *
 * Only the Navigator island persists; the header around it is rendered afresh. The incoming header
 * starts in the outgoing header's state, so its first frame matches the last one, and it then settles
 * into the new page's state through its own CSS transitions (the same motion as scrolling), in step
 * with the page cross-fade. header.css shows the header layers live during the view transition
 * instead of cross-fading two snapshots.
 */

const STATE_CLASSES = ['with-background', '-translate-y-full'];

/**
 * A new page opens with the header shown. Transitions the Navigator started while the new state was
 * being captured are rewound, so the header moves together with the first frame of the cross-fade.
 */
function settle(header: HTMLElement): void {
  header.classList.remove('-translate-y-full');
  for (const animation of header.getAnimations({ subtree: true })) {
    if (animation instanceof CSSTransition) animation.currentTime = 0;
  }
}

export function setupHeaderContinuity(): void {
  document.addEventListener('astro:before-swap', (event) => {
    const outgoing = document.getElementById('site-header');
    const incoming = event.newDocument.getElementById('site-header');
    if (!outgoing || !incoming) return;
    for (const name of STATE_CLASSES) incoming.classList.toggle(name, outgoing.classList.contains(name));
    event.viewTransition.ready.finally(() => settle(incoming)).catch(() => {});
  });

  // Styling the carried state now makes it the start of every header transition; otherwise the first
  // style pass would already see the settled state and the header would jump. The theme classes that
  // the swap strips from <html> are restored by earlier after-swap listeners (BootScripts).
  document.addEventListener('astro:after-swap', () => {
    document.getElementById('site-header')?.getBoundingClientRect();
  });
}

/**
 * Smooth expand/collapse animation for <details class="collapse-block"> elements.
 * Uses the Web Animations API. Respects prefers-reduced-motion.
 */
export function setupCollapseAnimations(container: Element): void {
  const blocks = container.querySelectorAll<HTMLDetailsElement>('details.collapse-block');

  for (const details of blocks) {
    if (details.dataset.collapseAnim) continue;
    details.dataset.collapseAnim = '1';

    const summary = details.querySelector('summary');
    const content = details.querySelector<HTMLElement>('.collapse-content');
    if (!summary || !content) continue;

    let anim: Animation | null = null;

    summary.addEventListener('click', (e) => {
      e.preventDefault();

      // Respect reduced motion preference — toggle instantly
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        details.open = !details.open;
        return;
      }

      // Cancel in-flight animation
      if (anim) {
        anim.cancel();
        content.style.removeProperty('overflow');
        anim = null;
      }

      const willOpen = !details.open;
      const cs = getComputedStyle(content);

      if (willOpen) {
        // Expand: set open first so content is laid out and measurable
        details.open = true;
        const h = content.offsetHeight;
        const pt = cs.paddingTop;
        const pb = cs.paddingBottom;

        content.style.overflow = 'clip';
        anim = content.animate(
          [
            { height: '0px', paddingTop: '0px', paddingBottom: '0px' },
            { height: `${h}px`, paddingTop: pt, paddingBottom: pb },
          ],
          { duration: 250, easing: 'ease' },
        );
        anim.onfinish = () => {
          content.style.removeProperty('overflow');
          anim = null;
        };
      } else {
        // Collapse: animate first, then remove open attribute
        const h = content.offsetHeight;
        const pt = cs.paddingTop;
        const pb = cs.paddingBottom;

        content.style.overflow = 'clip';
        anim = content.animate(
          [
            { height: `${h}px`, paddingTop: pt, paddingBottom: pb },
            { height: '0px', paddingTop: '0px', paddingBottom: '0px' },
          ],
          { duration: 250, easing: 'ease' },
        );
        anim.onfinish = () => {
          details.open = false;
          content.style.removeProperty('overflow');
          anim = null;
        };
      }
    });
  }
}

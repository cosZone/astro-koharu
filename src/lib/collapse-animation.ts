/**
 * Smooth expand/collapse animation for <details class="collapse-block"> elements.
 * Uses the Web Animations API. Respects prefers-reduced-motion.
 */
import { isMotionDisabled, subscribeMotionLevel } from '@lib/motion-level';

export function setupCollapseAnimations(container: Element): void {
  const blocks = container.querySelectorAll<HTMLDetailsElement>('details.collapse-block');

  for (const details of blocks) {
    if (details.dataset.collapseAnim) continue;
    details.dataset.collapseAnim = '1';

    const summary = details.querySelector('summary');
    const content = details.querySelector<HTMLElement>('.collapse-content');
    if (!summary || !content) continue;

    let anim: Animation | null = null;
    let unsubscribeMotion: (() => void) | undefined;
    let targetOpen = details.open;

    const clearAnimation = () => {
      anim?.cancel();
      anim = null;
      content.style.removeProperty('overflow');
      unsubscribeMotion?.();
      unsubscribeMotion = undefined;
    };

    summary.addEventListener('click', (e) => {
      e.preventDefault();

      const willOpen = !(anim ? targetOpen : details.open);
      clearAnimation();
      targetOpen = willOpen;
      if (isMotionDisabled()) {
        details.open = willOpen;
        return;
      }
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
      }

      const finish = () => {
        details.open = willOpen;
        clearAnimation();
      };
      anim.onfinish = finish;
      unsubscribeMotion = subscribeMotionLevel(() => {
        if (isMotionDisabled()) finish();
      });
    });
  }
}

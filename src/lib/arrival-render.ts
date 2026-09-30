/**
 * A post arriving through a forward view transition skips rendering its off-screen code blocks and
 * tables until the morph has played, so the incoming page's first frame (and with it the transition)
 * is ready sooner. They are handed back to full rendering a batch per frame, top to bottom, so their
 * layout never lands as one long task.
 *
 * Only the blocks that are expensive to lay out are skipped: every skipped block adds to the
 * per-frame layerization cost while the transition runs. Infographic sources are left alone, since
 * they measure their text while rendering. Traversals and hash links render fully from the start,
 * because restoring a scroll position or landing on an anchor needs the real layout.
 */

import { isInfographicBlock } from '@lib/content-enhancer-utils';

const HEAVY_BLOCKS = ':scope > :is(pre.astro-code, .code-block-wrapper, table)';
const BLOCKS_PER_FRAME = 24;

function release(blocks: HTMLElement[]): void {
  let index = 0;
  const step = () => {
    const end = Math.min(index + BLOCKS_PER_FRAME, blocks.length);
    for (; index < end; index++) {
      blocks[index].style.removeProperty('content-visibility');
      blocks[index].style.removeProperty('contain-intrinsic-size');
    }
    if (index < blocks.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function setupArrivalRender(): void {
  document.addEventListener('astro:before-swap', (event) => {
    if (event.navigationType === 'traverse' || event.to.hash) return;
    const content = event.newDocument.querySelector('.custom-content');
    if (!content) return;
    const blocks = Array.from(content.querySelectorAll<HTMLElement>(HEAVY_BLOCKS)).filter((block) => {
      const pre = block.matches('pre') ? block : block.querySelector('pre');
      return !(pre && isInfographicBlock(pre));
    });
    for (const block of blocks) {
      block.style.contentVisibility = 'auto';
      block.style.containIntrinsicSize = 'auto 12rem';
    }
    event.viewTransition.finished.finally(() => release(blocks));
  });
}

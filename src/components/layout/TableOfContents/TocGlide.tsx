/**
 * TocGlide Component
 *
 * The moving layer of the silk-thread TOC: the wash behind the current row, the gradient tail that
 * fills the thread down to it, and the petal on the thread. Render it as the first child of the
 * `.toc-container` nav; `useTocGlide` positions the parts.
 */

import { useTocGlide } from '@hooks/useTocGlide';
import { PETAL_MASK } from '@lib/sakura/petal';
import type { Heading } from '@lib/toc';
import { useRef } from 'react';
import { useTocContext } from './TocContext';

export function TocGlide({ headings }: { headings: Heading[] }) {
  const { activeId } = useTocContext();
  const washRef = useRef<HTMLSpanElement>(null);
  const tailRef = useRef<HTMLSpanElement>(null);
  const petalRef = useRef<HTMLSpanElement>(null);

  useTocGlide(washRef, tailRef, petalRef, activeId || null, headings);

  return (
    <>
      <span ref={washRef} className="toc-wash" data-toc-rail aria-hidden="true" />
      <span ref={tailRef} className="toc-tail" data-toc-rail aria-hidden="true" />
      <span ref={petalRef} className="toc-petal" data-toc-rail aria-hidden="true">
        <span style={{ maskImage: PETAL_MASK, WebkitMaskImage: PETAL_MASK }} />
      </span>
    </>
  );
}

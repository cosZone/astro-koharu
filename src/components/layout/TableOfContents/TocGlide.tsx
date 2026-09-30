import type { ReadingProgress } from '@hooks/useReadingProgress';
import { useTocGlide } from '@hooks/useTocGlide';
import { PETAL_MASK } from '@lib/sakura/petal';
import type { Heading } from '@lib/toc';
import { useId, useRef } from 'react';
import { useTocContext } from './TocContext';

export function TocGlide({
  headings,
  subscribeFrame,
}: {
  headings: Heading[];
  subscribeFrame: ReadingProgress['subscribeFrame'];
}) {
  const { activeId } = useTocContext();
  const washRef = useRef<HTMLSpanElement>(null);
  const threadRef = useRef<SVGPathElement>(null);
  const tailRef = useRef<SVGPathElement>(null);
  const petalRef = useRef<HTMLSpanElement>(null);
  const gradientId = `toc-ribbon-${useId().replaceAll(':', '')}`;

  useTocGlide(washRef, threadRef, tailRef, petalRef, activeId || null, headings, subscribeFrame);

  return (
    <>
      <svg className="toc-ribbon" data-toc-rail aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100%">
            <stop offset="0%" className="toc-ribbon-start" />
            <stop offset="100%" className="toc-ribbon-end" />
          </linearGradient>
        </defs>
        <path ref={threadRef} className="toc-ribbon-thread" />
        <path ref={tailRef} className="toc-ribbon-tail" stroke={`url(#${gradientId})`} />
      </svg>
      <span ref={washRef} className="toc-wash" data-toc-rail aria-hidden="true" />
      <span ref={petalRef} className="toc-petal" data-toc-rail aria-hidden="true">
        <span style={{ maskImage: PETAL_MASK, WebkitMaskImage: PETAL_MASK }} />
      </span>
    </>
  );
}

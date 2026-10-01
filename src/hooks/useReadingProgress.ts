/**
 * useReadingProgress Hook
 *
 * Follows the article's reading line. The current heading is React state; section progress streams to
 * `subscribeFrame` listeners on every frame, so per-frame visuals never re-render the tree.
 *
 * Section offsets are cached relative to the article. One article-position read per frame
 * keeps progress correct when content above it expands; visibility and size changes remeasure headings.
 *
 * @example
 * ```tsx
 * const { flat, activeIndex, subscribeFrame } = useReadingProgress(headings, 120);
 * ```
 */

import { getLockedHeadingId } from '@lib/heading-scroll-lock';
import { flattenHeadings, type Heading, locateReading, readingLineAt } from '@lib/toc';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface ReadingFrame {
  /** Heading whose section holds the reading line, '' above the first heading */
  id: string;
  /** Fraction of that section above the reading line, 0–1 */
  progress: number;
  chapterId?: string;
  chapterProgress?: number;
}

export type ReadingFrameListener = (frame: ReadingFrame) => void;

export interface ReadingProgress {
  /** Every heading in document order */
  flat: Heading[];
  /** Document-order index of the heading under the reading line, -1 above the first heading */
  activeIndex: number;
  /** Subscribe to the reading position; a new listener immediately receives the latest frame */
  subscribeFrame: (listener: ReadingFrameListener) => () => void;
}

export function useReadingProgress(headings: Heading[], offsetTop: number, enabled = true): ReadingProgress {
  const flat = useMemo(() => flattenHeadings(headings), [headings]);
  const order = useMemo(() => new Map(flat.map((heading, index) => [heading.id, index])), [flat]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listeners = useRef(new Set<ReadingFrameListener>());
  const latest = useRef<ReadingFrame>({ id: '', progress: 0 });

  const subscribeFrame = useCallback((listener: ReadingFrameListener) => {
    listeners.current.add(listener);
    listener(latest.current);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
    latest.current = { id: '', progress: 0 };
    if (!enabled) return;

    const article = document.querySelector('article');
    const elements = flat.map((heading) => document.getElementById(heading.id));
    if (!article || elements.length === 0 || elements.some((element) => !element)) return;
    const headingElements = elements as HTMLElement[];
    const chapterForIndex = flat.map((heading) => {
      let root = heading;
      while (root.parent) root = root.parent;
      return order.get(root.id) ?? -1;
    });
    const headingAncestors = new Set<Element>();
    for (const element of headingElements) {
      let ancestor: Element | null = element;
      while (ancestor && ancestor !== article) {
        headingAncestors.add(ancestor);
        ancestor = ancestor.parentElement;
      }
    }
    headingAncestors.add(article);

    let visibleIndexes: number[] = [];
    let starts: number[] = [];
    let chapterIndexes: number[] = [];
    let chapterStarts: number[] = [];
    let end = 0;
    let currentIndex = -1;
    let frame = 0;
    let disposed = false;
    let needsMeasure = true;

    const measure = () => {
      const box = article.getBoundingClientRect();
      visibleIndexes = headingElements.flatMap((element, index) => (element.getClientRects().length ? [index] : []));
      starts = visibleIndexes.map((index) => headingElements[index].getBoundingClientRect().top - box.top);
      const chapters = new Map<number, number>();
      visibleIndexes.forEach((index, visibleIndex) => {
        const chapter = chapterForIndex[index];
        if (!chapters.has(chapter)) chapters.set(chapter, starts[visibleIndex]);
      });
      chapterIndexes = [...chapters.keys()];
      chapterStarts = [...chapters.values()];
      end = box.height;
      needsMeasure = false;
    };

    const update = () => {
      frame = 0;
      if (needsMeasure) measure();
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
      const articleTop = article.getBoundingClientRect().top + window.scrollY;
      const line = readingLineAt(window.scrollY, window.innerHeight, maxScrollY, offsetTop) - articleTop;
      let position = locateReading(starts, end, line);

      // A TOC click pins its heading while the smooth scroll runs. The sections it flies past were
      // skipped: they should not become active.
      const lockedIndex = order.get(getLockedHeadingId() ?? '') ?? -1;
      const lockedVisibleIndex = lockedIndex >= 0 ? visibleIndexes.indexOf(lockedIndex) : -1;
      if (lockedVisibleIndex >= 0) {
        position = { index: lockedVisibleIndex, progress: position.index === lockedVisibleIndex ? position.progress : 0 };
      }

      const index = visibleIndexes[position.index] ?? -1;
      if (index !== currentIndex) {
        currentIndex = index;
        setActiveIndex(index);
      }
      const chapterPosition = locateReading(chapterStarts, end, line);
      let chapterIndex = chapterPosition.index;
      if (lockedVisibleIndex >= 0) chapterIndex = chapterIndexes.indexOf(chapterForIndex[lockedIndex]);
      latest.current = {
        id: flat[index]?.id ?? '',
        progress: position.progress,
        chapterId: flat[chapterIndexes[chapterIndex]]?.id ?? '',
        chapterProgress: chapterIndex === chapterPosition.index ? chapterPosition.progress : 0,
      };
      for (const listener of listeners.current) listener(latest.current);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const remeasure = () => {
      if (disposed) return;
      needsMeasure = true;
      schedule();
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    // The heading scroll lock releases on `scrollend`; re-read once it has
    window.addEventListener('scrollend', schedule);
    window.addEventListener('resize', remeasure);
    const observer = new ResizeObserver(remeasure);
    observer.observe(article);
    const visibilityObserver = new MutationObserver((records) => {
      if (records.some((record) => headingAncestors.has(record.target as Element))) remeasure();
    });
    visibilityObserver.observe(article, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class', 'style', 'hidden', 'open'],
    });
    document.fonts.ready.then(remeasure);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('scrollend', schedule);
      window.removeEventListener('resize', remeasure);
      observer.disconnect();
      visibilityObserver.disconnect();
    };
  }, [flat, order, offsetTop, enabled]);

  return { flat, activeIndex, subscribeFrame };
}

/**
 * useTocGlide Hook
 *
 * Drives the moving parts of the silk-thread TOC (see src/styles/components/toc.css). A wash and a
 * petal spring onto the current heading's row with the nav pill's glide physics (`@lib/glide`), the
 * tail fills the thread from the first knot down to the petal, and each row gets `data-passed` the
 * moment the petal crosses it. The petal leans against its motion, and the current row is kept in
 * view inside its scroll area (`[data-toc-scroller]`). Everything is written to the DOM per frame, so
 * the TOC never re-renders for the motion.
 */

import {
  GLIDE_FEELS,
  type GlideFeel,
  type GlideState,
  glideAt,
  glideSpan,
  isGlideAtRest,
  type Span,
  stepGlide,
} from '@lib/glide';
import { readMotionLevel } from '@lib/motion-level';
import { clamp } from 'es-toolkit';
import { type RefObject, useLayoutEffect, useRef } from 'react';

/** Petal lean in degrees per px/s of glide speed, and its cap. */
const LEAN_PER_SPEED = -0.03;
const MAX_LEAN = 24;
/** The current row may drift within this band of its scroll area before it is brought back to FOLLOW_AT. */
const COMFORT_BAND = [0.15, 0.75] as const;
const FOLLOW_AT = 0.35;

interface TocGlideParts {
  wash: HTMLElement;
  tail: HTMLElement;
  petal: HTMLElement;
}

interface TocGlideController {
  moveTo(id: string | null): void;
  destroy(): void;
}

function createTocGlide(nav: HTMLElement, parts: TocGlideParts): TocGlideController {
  let row: HTMLElement | null = null;
  let rows: HTMLElement[] = [];
  let centers: number[] = [];
  let firstCenter = 0;
  let state: GlideState | null = null;
  let feel: GlideFeel | null = null;
  let frame = 0;
  let lastTime = 0;
  let followed = false;

  /** Maps a viewport y onto the nav's own coordinates, where the absolutely placed parts live. */
  const toNav = () => {
    const box = nav.getBoundingClientRect();
    const scale = box.height / nav.offsetHeight || 1;
    const origin = box.top + nav.clientTop * scale;
    return (y: number) => (y - origin) / scale + nav.scrollTop;
  };

  const measureRows = () => {
    const at = toNav();
    rows = Array.from(nav.querySelectorAll<HTMLElement>('[data-toc-row]'));
    centers = rows.map((element) => {
      const rect = element.getBoundingClientRect();
      return at(rect.top + rect.height / 2);
    });
    firstCenter = centers[0] ?? 0;
  };

  const measure = (): Span | null => {
    if (!row?.isConnected || nav.getClientRects().length === 0) return null;
    const rect = row.getBoundingClientRect();
    if (rect.height === 0) return null;
    const at = toNav();
    return { left: at(rect.top), right: at(rect.bottom) };
  };

  const paint = (span: Span, speed: number) => {
    const height = Math.max(span.right - span.left, 0);
    const center = span.left + height / 2;
    parts.wash.style.translate = `0 ${span.left}px`;
    parts.wash.style.height = `${height}px`;
    parts.petal.style.translate = `0 ${center}px`;
    parts.petal.style.setProperty('--toc-lean', `${clamp(speed * LEAN_PER_SPEED, -MAX_LEAN, MAX_LEAN)}deg`);
    parts.tail.style.translate = `0 ${firstCenter}px`;
    parts.tail.style.height = `${Math.max(center - firstCenter, 0)}px`;
    rows.forEach((element, index) => {
      const passed = centers[index] < center - 1;
      if (element.hasAttribute('data-passed') !== passed) element.toggleAttribute('data-passed', passed);
    });
  };

  const snap = () => {
    const target = measure();
    if (!target) return;
    state = glideAt(target);
    paint(target, 0);
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const tick = (now: number) => {
    frame = 0;
    const target = measure();
    if (!target || !state || !feel) {
      snap();
      return;
    }
    state = stepGlide(state, target, feel, now - lastTime);
    lastTime = now;
    if (isGlideAtRest(state, target)) {
      snap();
      return;
    }
    paint(glideSpan(state, feel), state.centerVelocity);
    frame = requestAnimationFrame(tick);
  };

  /** Brings the current row back into view, unless the reader has the pointer on the list. */
  const follow = (instant: boolean) => {
    const scroller = nav.closest<HTMLElement>('[data-toc-scroller]');
    if (!scroller || !row || scroller.scrollHeight <= scroller.clientHeight + 1) return;
    if (!instant && scroller.matches(':hover')) return;
    const view = scroller.clientHeight;
    const rect = row.getBoundingClientRect();
    const offset = rect.top + rect.height / 2 - scroller.getBoundingClientRect().top;
    if (offset >= view * COMFORT_BAND[0] && offset <= view * COMFORT_BAND[1]) return;
    scroller.scrollTo({
      top: scroller.scrollTop + offset - view * FOLLOW_AT,
      behavior: instant || !feel ? 'instant' : 'smooth',
    });
  };

  // Sections unfolding or folding move every row below them; keep the parts on their rows.
  const observer = new ResizeObserver(() => {
    measureRows();
    if (!frame) snap();
  });
  observer.observe(nav);
  for (const item of nav.querySelectorAll(':scope > .heading-tree-item')) observer.observe(item);

  return {
    moveTo(id) {
      nav.toggleAttribute('data-toc-live', id !== null);
      if (id === null) {
        stop();
        row = null;
        state = null;
        for (const element of rows) element.removeAttribute('data-passed');
        return;
      }
      const onScreen = state !== null;
      row = nav.querySelector<HTMLElement>(`[data-toc-row="${CSS.escape(id)}"]`);
      const level = readMotionLevel();
      feel = level === 'reduced' ? null : GLIDE_FEELS[level];
      measureRows();
      follow(!followed);
      followed = true;
      if (!onScreen || !feel) {
        stop();
        snap();
        return;
      }
      if (!frame) {
        lastTime = performance.now();
        frame = requestAnimationFrame(tick);
      }
    },
    destroy() {
      stop();
      observer.disconnect();
    },
  };
}

/**
 * Glides the TOC's wash, tail and petal (first children of the `.toc-container` nav) to the row marked
 * `data-toc-row={activeId}`. `rowsKey` must change whenever the heading tree does, so the rows are
 * observed afresh.
 */
export function useTocGlide(
  washRef: RefObject<HTMLElement | null>,
  tailRef: RefObject<HTMLElement | null>,
  petalRef: RefObject<HTMLElement | null>,
  activeId: string | null,
  rowsKey: unknown,
) {
  const controllerRef = useRef<TocGlideController | null>(null);
  const activeRef = useRef(activeId);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rowsKey is the trigger that re-observes a new heading tree.
  useLayoutEffect(() => {
    const wash = washRef.current;
    const tail = tailRef.current;
    const petal = petalRef.current;
    const nav = wash?.parentElement;
    if (!wash || !tail || !petal || !nav) return;
    const controller = createTocGlide(nav, { wash, tail, petal });
    controllerRef.current = controller;
    controller.moveTo(activeRef.current);
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [washRef, tailRef, petalRef, rowsKey]);

  useLayoutEffect(() => {
    activeRef.current = activeId;
    controllerRef.current?.moveTo(activeId);
  }, [activeId]);
}

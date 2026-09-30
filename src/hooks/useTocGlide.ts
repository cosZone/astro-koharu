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
import { readMotionLevel, subscribeMotionLevel } from '@lib/motion-level';
import { clamp } from 'es-toolkit';
import { type RefObject, useLayoutEffect, useRef } from 'react';
import type { ReadingFrame, ReadingProgress } from './useReadingProgress';

/** Petal lean in degrees per px/s of glide speed, and its cap. */
const LEAN_PER_SPEED = -0.03;
const MAX_LEAN = 24;
/** The current row may drift within this band of its scroll area before it is brought back to FOLLOW_AT. */
const COMFORT_BAND = [0.15, 0.75] as const;
const FOLLOW_AT = 0.35;

interface TocGlideParts {
  wash: HTMLElement;
  thread: SVGPathElement;
  tail: SVGPathElement;
  petal: HTMLElement;
}

interface TocGlideController {
  moveTo(id: string | null): void;
  setProgress(progress: ReadingFrame): void;
  destroy(): void;
}

function createTocGlide(nav: HTMLElement, parts: TocGlideParts): TocGlideController {
  let row: HTMLElement | null = null;
  let rows: HTMLElement[] = [];
  let centers: number[] = [];
  let knots: { x: number; y: number }[] = [];
  let latest: ReadingFrame = { id: '', progress: 0 };
  let threadLength = 0;
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
    if (nav.getClientRects().length === 0) return;
    const at = toNav();
    const navBox = nav.getBoundingClientRect();
    const scale = navBox.width / nav.offsetWidth || 1;
    rows = Array.from(nav.querySelectorAll<HTMLElement>('[data-toc-row]')).filter((element) => !element.closest('[inert]'));
    centers = rows.map((element) => {
      const rect = element.getBoundingClientRect();
      return at(rect.top + rect.height / 2);
    });
    const points = rows.map((element, index) => {
      const knot = element.querySelector<HTMLElement>('.toc-node');
      const rect = (knot ?? element).getBoundingClientRect();
      return { x: (rect.left + rect.width / 2 - navBox.left) / scale + nav.scrollLeft, y: centers[index] };
    });
    knots = points;
    let path = '';
    if (points.length) {
      path = `M ${points[0].x} ${points[0].y}`;
      for (let index = 1; index < points.length; index++) {
        const previous = points[index - 1];
        const next = points[index];
        const delta = next.x - previous.x;
        if (Math.abs(delta) < 0.5) {
          path += ` L ${next.x} ${next.y}`;
          continue;
        }
        const middle = (previous.y + next.y) / 2;
        const radius = Math.min(6, Math.abs(delta) / 2, Math.max(next.y - previous.y, 0) / 4);
        const direction = Math.sign(delta);
        path += ` L ${previous.x} ${middle - radius}`;
        path += ` Q ${previous.x} ${middle} ${previous.x + direction * radius} ${middle}`;
        path += ` L ${next.x - direction * radius} ${middle}`;
        path += ` Q ${next.x} ${middle} ${next.x} ${middle + radius}`;
        path += ` L ${next.x} ${next.y}`;
      }
      const last = points[points.length - 1];
      path += ` L ${last.x} ${last.y + 12}`;
    }
    parts.thread.setAttribute('d', path);
    parts.tail.setAttribute('d', path);
    const svg = parts.thread.ownerSVGElement;
    svg?.setAttribute('width', String(nav.clientWidth));
    // An absolute SVG must not keep its previous height in the scroller's overflow.
    svg?.setAttribute('height', String((points.at(-1)?.y ?? 0) + 12));
    threadLength = path ? parts.thread.getTotalLength() : 0;
    parts.tail.style.strokeDasharray = String(threadLength);
  };

  // The path always travels downwards; find a row's position along it only when targeting that row.
  const lengthAtY = (y: number) => {
    let low = 0;
    let high = threadLength;
    for (let index = 0; index < 16; index++) {
      const middle = (low + high) / 2;
      if (parts.thread.getPointAtLength(middle).y < y) low = middle;
      else high = middle;
    }
    return (low + high) / 2;
  };

  const visibleRow = () => {
    let visible = row;
    while (visible) {
      const collapsed = visible.closest<HTMLElement>('[inert]');
      if (!collapsed) return visible;
      visible = collapsed.parentElement?.querySelector<HTMLElement>(':scope > .toc-heading-row > [data-toc-row]') ?? null;
    }
    return null;
  };

  const readFraction = (visible: HTMLElement | null) => {
    if (!visible) return 0;
    const id = visible.dataset.tocRow;
    if (latest.id === id) return latest.progress;
    return latest.chapterId === id ? (latest.chapterProgress ?? 0) : 0;
  };

  const measure = (): Span | null => {
    const visible = visibleRow();
    if (!visible?.isConnected || nav.getClientRects().length === 0 || threadLength === 0) return null;
    const index = rows.indexOf(visible);
    if (index < 0) return null;
    const rect = visible.getBoundingClientRect();
    const at = toNav();
    const height = at(rect.bottom) - at(rect.top);
    const start = lengthAtY(centers[index]);
    const end = index + 1 < centers.length ? lengthAtY(centers[index + 1]) : threadLength;
    const center = start + (end - start) * clamp(readFraction(visible), 0, 1);
    return { left: center - height / 2, right: center + height / 2 };
  };

  const paint = (span: Span, speed: number) => {
    const height = Math.max(span.right - span.left, 0);
    const distance = clamp(span.left + height / 2, 0, threadLength);
    const point = parts.thread.getPointAtLength(distance);
    const visible = visibleRow();
    const index = visible ? rows.indexOf(visible) : -1;
    const knot = knots[index] ?? point;
    parts.wash.style.translate = `0 ${knot.y - height / 2}px`;
    parts.wash.style.left = `${Math.max(knot.x - 7, 0)}px`;
    parts.wash.style.height = `${height}px`;
    const readout = visible?.parentElement?.querySelector<HTMLElement>('.toc-section-progress');
    if (readout) {
      const percent = Math.round(readFraction(visible) * 100);
      if (readout.getAttribute('aria-valuenow') !== String(percent)) {
        readout.textContent = `${percent}%`;
        readout.setAttribute('aria-valuenow', String(percent));
      }
    }
    parts.petal.style.translate = `${point.x}px ${point.y}px`;
    parts.petal.style.setProperty('--toc-lean', `${clamp(speed * LEAN_PER_SPEED, -MAX_LEAN, MAX_LEAN)}deg`);
    parts.tail.style.strokeDashoffset = String(threadLength - distance);
    rows.forEach((element, index) => {
      const passed = centers[index] < point.y - 1;
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

  const kick = () => {
    if (frame || document.hidden || nav.getClientRects().length === 0) return;
    lastTime = performance.now();
    frame = requestAnimationFrame(tick);
  };

  /** Brings the current row back into view, unless the reader has the pointer on the list. */
  const follow = (instant: boolean) => {
    const scroller = nav.closest<HTMLElement>('[data-toc-scroller]');
    const visible = visibleRow();
    if (!scroller || !visible || scroller.scrollHeight <= scroller.clientHeight + 1) return;
    if (!instant && scroller.matches(':hover')) return;
    const view = scroller.clientHeight;
    const rect = visible.getBoundingClientRect();
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

  const unsubscribeMotion = subscribeMotionLevel(() => {
    const level = readMotionLevel();
    feel = level === 'reduced' ? null : GLIDE_FEELS[level];
    stop();
    if (feel) kick();
    else snap();
  });
  const onVisibility = () => {
    if (document.hidden) stop();
    else snap();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return {
    setProgress(progress) {
      latest = progress;
      if (!row) return;
      if (!feel) snap();
      else kick();
    },
    moveTo(id) {
      measureRows();
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
      unsubscribeMotion();
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}

/**
 * Glides the TOC's wash, tail and petal to the row marked
 * `data-toc-row={activeId}`. `rowsKey` must change whenever the heading tree does, so the rows are
 * observed afresh.
 */
export function useTocGlide(
  washRef: RefObject<HTMLElement | null>,
  threadRef: RefObject<SVGPathElement | null>,
  tailRef: RefObject<SVGPathElement | null>,
  petalRef: RefObject<HTMLElement | null>,
  activeId: string | null,
  rowsKey: unknown,
  subscribeFrame: ReadingProgress['subscribeFrame'],
) {
  const controllerRef = useRef<TocGlideController | null>(null);
  const activeRef = useRef(activeId);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rowsKey is the trigger that re-observes a new heading tree.
  useLayoutEffect(() => {
    const wash = washRef.current;
    const thread = threadRef.current;
    const tail = tailRef.current;
    const petal = petalRef.current;
    const nav = wash?.parentElement;
    if (!wash || !thread || !tail || !petal || !nav) return;
    const controller = createTocGlide(nav, { wash, thread, tail, petal });
    controllerRef.current = controller;
    controller.moveTo(activeRef.current);
    const unsubscribe = subscribeFrame(controller.setProgress);
    return () => {
      unsubscribe();
      controller.destroy();
      controllerRef.current = null;
    };
  }, [washRef, threadRef, tailRef, petalRef, rowsKey, subscribeFrame]);

  useLayoutEffect(() => {
    activeRef.current = activeId;
    controllerRef.current?.moveTo(activeId);
  }, [activeId]);
}

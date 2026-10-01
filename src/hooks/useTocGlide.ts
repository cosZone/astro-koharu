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
import { buildRibbon, type Ribbon, type RibbonRow } from '@lib/toc-ribbon';
import { clamp } from 'es-toolkit';
import { type RefObject, useLayoutEffect, useRef } from 'react';
import type { ReadingFrame, ReadingProgress } from './useReadingProgress';

/** Petal lean in degrees per px/s of glide speed, and its cap. */
const LEAN_PER_SPEED = -0.03;
const MAX_LEAN = 24;
/** The current row may drift within this band of its scroll area before it is brought back to FOLLOW_AT. */
const COMFORT_BAND = [0.15, 0.75] as const;
const FOLLOW_AT = 0.35;
/** The wash starts this far left of the ribbon, so the ribbon runs inside it. */
const WASH_INSET = 7;

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

/** The row a folded or still-closed section shows in place of the rows inside it. */
function ownerRow(element: HTMLElement): HTMLElement | null {
  return (
    element
      .closest('.silk-heading-children')
      ?.parentElement?.querySelector<HTMLElement>(':scope > .toc-heading-row > [data-toc-row]') ?? null
  );
}

function createTocGlide(nav: HTMLElement, parts: TocGlideParts): TocGlideController {
  let row: HTMLElement | null = null;
  let rows: HTMLElement[] = [];
  let passedRows: boolean[] = [];
  let boxes: RibbonRow[] = [];
  let knots: number[] = [];
  let ribbon: Ribbon = buildRibbon([]);
  let latest: ReadingFrame = { id: '', progress: 0 };
  // The wash springs between rows in nav y; the petal springs along the ribbon's length.
  let wash: GlideState | null = null;
  let petal: GlideState | null = null;
  let feel: GlideFeel | null = null;
  let frame = 0;
  let lastTime = 0;
  let followed = false;
  let followedRow: HTMLElement | null = null;

  /**
   * Layout position in the nav's scrolled content, where the absolutely placed parts live. Offsets
   * ignore transforms, so rows caught mid-way through the sider's cascade still measure at rest.
   */
  const offsetIn = (element: HTMLElement) => {
    let x = 0;
    let y = 0;
    for (let node: HTMLElement | null = element; node && node !== nav; node = node.offsetParent as HTMLElement | null) {
      x += node.offsetLeft;
      y += node.offsetTop;
    }
    return { x, y };
  };

  const measureRows = () => {
    if (nav.getClientRects().length === 0) return;
    rows = [];
    boxes = [];
    knots = [];
    let floor = Number.NEGATIVE_INFINITY;
    for (const element of nav.querySelectorAll<HTMLElement>('[data-toc-row]')) {
      if (element.closest('[inert]')) continue;
      let top = offsetIn(element).y;
      let bottom = top + element.offsetHeight;
      // A section that is still unfolding clips its rows; the ribbon only reaches what shows.
      for (
        let clip = element.parentElement?.closest<HTMLElement>('.silk-heading-children-inner');
        clip;
        clip = clip.parentElement?.closest<HTMLElement>('.silk-heading-children-inner')
      ) {
        const clipTop = offsetIn(clip).y;
        top = Math.max(top, clipTop);
        bottom = Math.min(bottom, clipTop + clip.offsetHeight);
      }
      top = Math.max(top, floor);
      if (bottom - top < 1) continue;
      floor = bottom;
      const node = element.querySelector<HTMLElement>('.toc-node') ?? element;
      const knot = offsetIn(node);
      rows.push(element);
      boxes.push({ x: knot.x + node.offsetWidth / 2, top, bottom });
      knots.push(knot.y + node.offsetHeight / 2);
    }
    ribbon = buildRibbon(boxes);
    passedRows = rows.map((element) => element.hasAttribute('data-passed'));
    parts.thread.setAttribute('d', ribbon.d);
    parts.tail.setAttribute('d', ribbon.d);
    // Dash lengths in the ribbon's own units, so the dyed stretch ends exactly under the petal.
    parts.tail.setAttribute('pathLength', String(ribbon.length || 1));
    parts.tail.style.strokeDasharray = String(ribbon.length);
    const svg = parts.thread.ownerSVGElement;
    svg?.setAttribute('width', String(nav.clientWidth));
    // An absolute SVG must not keep its previous height in the scroller's overflow.
    svg?.setAttribute('height', String(ribbon.pointAt(ribbon.length).y));
  };

  const visibleRow = () => {
    let visible = row;
    while (visible && !rows.includes(visible)) visible = ownerRow(visible);
    return visible;
  };

  const readFraction = (visible: HTMLElement | null) => {
    if (!visible) return 0;
    const id = visible.dataset.tocRow;
    if (latest.id === id) return latest.progress;
    return latest.chapterId === id ? (latest.chapterProgress ?? 0) : 0;
  };

  /** Where the wash and the petal are heading: the current row, and how far down its stretch of ribbon. */
  const measure = (): { row: Span; along: number } | null => {
    const visible = visibleRow();
    const index = visible ? rows.indexOf(visible) : -1;
    if (index < 0 || ribbon.length === 0) return null;
    const start = ribbon.starts[index];
    const end = ribbon.ends[index];
    return {
      row: { left: boxes[index].top, right: boxes[index].bottom },
      along: start + (end - start) * clamp(readFraction(visible), 0, 1),
    };
  };

  const paint = (washSpan: Span, along: number, speed: number) => {
    const top = washSpan.left;
    const bottom = Math.max(washSpan.right, top);
    const lane = ribbon.pointAt(ribbon.lengthAt((top + bottom) / 2)).x;
    parts.wash.style.translate = `0 ${top}px`;
    parts.wash.style.left = `${Math.max(lane - WASH_INSET, 0)}px`;
    parts.wash.style.height = `${bottom - top}px`;
    // Racing through short sections, the wash trails the petal for a few frames; the petal then rides
    // the wash's edge, so it never shows outside the current row.
    let at = clamp(along, 0, ribbon.length);
    let point = ribbon.pointAt(at);
    if (point.y < top || point.y > bottom) {
      at = ribbon.lengthAt(clamp(point.y, top, bottom));
      point = ribbon.pointAt(at);
    }
    parts.petal.style.translate = `${point.x}px ${point.y}px`;
    parts.petal.style.setProperty('--toc-lean', `${clamp(speed * LEAN_PER_SPEED, -MAX_LEAN, MAX_LEAN)}deg`);
    parts.tail.style.strokeDashoffset = String(ribbon.length - at);
    rows.forEach((element, index) => {
      const passed = knots[index] < point.y - 1;
      if (passedRows[index] !== passed) {
        passedRows[index] = passed;
        element.toggleAttribute('data-passed', passed);
      }
    });
    const visible = visibleRow();
    const readout = visible?.parentElement?.querySelector<HTMLElement>('.toc-section-progress');
    if (readout) {
      const percent = String(Math.round(readFraction(visible) * 100));
      if (readout.getAttribute('aria-valuenow') !== percent) {
        readout.setAttribute('aria-valuenow', percent);
      }
    }
  };

  const snap = () => {
    const target = measure();
    if (!target) return;
    wash = glideAt(target.row);
    petal = glideAt({ left: target.along, right: target.along });
    paint(target.row, target.along, 0);
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const tick = (now: number) => {
    frame = 0;
    const target = measure();
    if (!target || !wash || !petal || !feel) {
      snap();
      return;
    }
    const elapsed = now - lastTime;
    lastTime = now;
    const along = { left: target.along, right: target.along };
    wash = stepGlide(wash, target.row, feel, elapsed);
    petal = stepGlide(petal, along, feel, elapsed);
    if (isGlideAtRest(wash, target.row) && isGlideAtRest(petal, along)) {
      snap();
      return;
    }
    paint(glideSpan(wash, feel), petal.center, petal.centerVelocity);
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
    followedRow = visible;
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

  // Sections unfolding or folding move every row below them; keep the parts on their rows. Once a
  // chapter has unfolded far enough to show the current row, that row is brought into view too.
  const observer = new ResizeObserver(() => {
    measureRows();
    if (!frame) snap();
    if (row && visibleRow() !== followedRow) follow(false);
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
        wash = null;
        petal = null;
        for (const element of rows) element.removeAttribute('data-passed');
        passedRows.fill(false);
        return;
      }
      const onScreen = wash !== null;
      row = nav.querySelector<HTMLElement>(`[data-toc-row="${CSS.escape(id)}"]`);
      const level = readMotionLevel();
      feel = level === 'reduced' ? null : GLIDE_FEELS[level];
      follow(!followed);
      followed = true;
      if (!onScreen || !feel) {
        stop();
        snap();
        return;
      }
      kick();
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
 * Glides the TOC's wash, tail and petal to the row marked `data-toc-row={activeId}`: the wash
 * settles on the row while the petal follows the reading position down that row's stretch of
 * ribbon. `rowsKey` must change whenever the heading tree does, so the rows are observed afresh.
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

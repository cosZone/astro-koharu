/**
 * Zoom and pan for the fullscreen diagram/image viewers.
 *
 * Input mapping (matches native macOS viewers):
 * - trackpad pinch (ctrl+wheel), Safari gesture events, two-finger touch pinch → continuous zoom at the fingers
 * - trackpad two-finger scroll → pan; a notched mouse wheel → animated zoom step at the cursor
 * - drag with mouse/pen/one finger → pan, rubber-banding past the edges and gliding on release
 *
 * The transform is written straight to the content element, never through React state, so a gesture
 * costs one style write per event. `will-change` is held only while moving: at rest the SVG is
 * repainted at its zoomed size instead of staying a stretched bitmap.
 *
 * Callback refs (not useRef) so listeners attach even when the viewer mounts inside a portal.
 */

import { isMotionDisabled, subscribeMotionLevel } from '@lib/motion-level';
import {
  clampToBounds,
  getPanBounds,
  IDENTITY,
  type PanBounds,
  rubberBand,
  type Size,
  wheelZoomFactor,
  type ZoomPanTransform,
  zoomAround,
} from '@lib/zoom-pan';
import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_SCALE = 0.5;
const MAX_SCALE = 6;
const WHEEL_STEP = 1.25;
const SETTLE_DELAY = 140;
const ANIMATION_MS = 320;
/** Time constant of the release glide, the same decay iOS scroll views use. */
const GLIDE_TAU = 325;
const VELOCITY_WINDOW = 80;

interface Pointer {
  x: number;
  y: number;
}

interface Gesture {
  start: ZoomPanTransform;
  origin: Pointer;
  distance: number;
  samples: { x: number; y: number; t: number }[];
}

export interface UseZoomPanReturn {
  viewportRef: (node: HTMLDivElement | null) => void;
  contentRef: (node: HTMLDivElement | null) => void;
  /** Rounded current scale for display; updates at most once per frame. */
  scale: number;
  zoomLevel: string;
  isZoomed: boolean;
  /** Animated zoom to an absolute scale, anchored at a client point (default: viewport center). */
  zoomTo: (scale: number, clientX?: number, clientY?: number) => void;
  zoomBy: (factor: number, clientX?: number, clientY?: number) => void;
  reset: (options?: { animate?: boolean }) => void;
}

const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;
const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
/** A little give past the limits while fingers are still moving; `settle` springs it back. */
const softClampScale = (s: number) => Math.min(MAX_SCALE * 1.15, Math.max(MIN_SCALE * 0.85, s));

/**
 * Chromium and WebKit report pixel deltas for both devices, but a mouse notch keeps a legacy
 * `wheelDeltaY` of ±120 while a trackpad's is exactly -3 × deltaY.
 */
function isMouseWheel(e: WheelEvent): boolean {
  if (e.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return true;
  if (e.deltaX !== 0) return false;
  const legacy = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
  if (typeof legacy === 'number' && legacy !== 0) return legacy % 120 === 0 && legacy !== -3 * e.deltaY;
  // Firefox has no wheelDeltaY: a notch arrives as one large whole-pixel step, a trackpad as small fractional ones.
  return Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40;
}

export function useZoomPan(enabled = true): UseZoomPanReturn {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const transformRef = useRef<ZoomPanTransform>(IDENTITY);
  const frameRef = useRef(0);
  const scaleFrameRef = useRef(0);
  const settleTimerRef = useRef(0);
  const animationTargetRef = useRef<ZoomPanTransform | null>(null);

  /** Pan limits at scale `s`, from the visible child rather than the full-size box around it. */
  const boundsAt = useCallback(
    (s: number): PanBounds => {
      if (!viewport || !content) return { x: 0, y: 0 };
      const rect = (content.firstElementChild ?? content).getBoundingClientRect();
      const current = transformRef.current.scale;
      const natural: Size = { width: rect.width / current, height: rect.height / current };
      return getPanBounds(natural, { width: viewport.clientWidth, height: viewport.clientHeight }, s);
    },
    [viewport, content],
  );

  const write = useCallback(
    (t: ZoomPanTransform) => {
      transformRef.current = t;
      if (!content) return;
      content.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale})`;
      content.style.willChange = 'transform';
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => {
        content.style.willChange = '';
      }, SETTLE_DELAY);
      if (!scaleFrameRef.current) {
        scaleFrameRef.current = requestAnimationFrame(() => {
          scaleFrameRef.current = 0;
          setScale(Math.round(transformRef.current.scale * 100) / 100);
        });
      }
    },
    [content],
  );

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    animationTargetRef.current = null;
  }, []);

  /** Scale moves geometrically and translation follows it, so an anchored zoom keeps its anchor still the whole way. */
  const animateTo = useCallback(
    (target: ZoomPanTransform) => {
      stop();
      if (isMotionDisabled()) {
        write(target);
        return;
      }
      const from = transformRef.current;
      const scaleChanges = Math.abs(target.scale - from.scale) > 1e-4;
      const startTime = performance.now();
      animationTargetRef.current = target;
      const step = (now: number) => {
        const p = easeOutQuart(Math.min(1, (now - startTime) / ANIMATION_MS));
        const s = from.scale * (target.scale / from.scale) ** p;
        const u = scaleChanges ? (s - from.scale) / (target.scale - from.scale) : p;
        write({ scale: s, x: from.x + (target.x - from.x) * u, y: from.y + (target.y - from.y) * u });
        if (p < 1) {
          frameRef.current = requestAnimationFrame(step);
        } else {
          frameRef.current = 0;
          animationTargetRef.current = null;
        }
      };
      frameRef.current = requestAnimationFrame(step);
    },
    [stop, write],
  );

  /** Pull an overshoot (scale or position) back inside its limits. */
  const settle = useCallback(() => {
    const t = transformRef.current;
    const s = clampScale(t.scale);
    const target = clampToBounds(s === t.scale ? t : zoomAround(t, s, 0, 0), boundsAt(s));
    if (target.scale !== t.scale || target.x !== t.x || target.y !== t.y) animateTo(target);
  }, [animateTo, boundsAt]);

  const toLocal = useCallback(
    (clientX?: number, clientY?: number): Pointer => {
      if (!viewport || clientX === undefined || clientY === undefined) return { x: 0, y: 0 };
      const rect = viewport.getBoundingClientRect();
      return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
    },
    [viewport],
  );

  const zoomTo = useCallback(
    (nextScale: number, clientX?: number, clientY?: number) => {
      const from = animationTargetRef.current ?? transformRef.current;
      const s = clampScale(nextScale);
      const p = toLocal(clientX, clientY);
      animateTo(clampToBounds(zoomAround(from, s, p.x, p.y), boundsAt(s)));
    },
    [animateTo, boundsAt, toLocal],
  );

  const zoomBy = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      // Chain from where a running animation is heading, so quick repeated steps compound.
      const from = animationTargetRef.current ?? transformRef.current;
      zoomTo(from.scale * factor, clientX, clientY);
    },
    [zoomTo],
  );

  const reset = useCallback(
    ({ animate = true }: { animate?: boolean } = {}) => {
      if (animate) {
        animateTo(IDENTITY);
      } else {
        stop();
        write(IDENTITY);
      }
    },
    [animateTo, stop, write],
  );

  useEffect(() => {
    if (!enabled || !viewport || !content) return;
    write(IDENTITY);

    let settleTimer = 0;
    const scheduleSettle = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, SETTLE_DELAY);
    };
    const unsubscribeMotion = subscribeMotionLevel(() => {
      if (!isMotionDisabled()) return;
      const target = animationTargetRef.current;
      stop();
      if (target) write(target);
      else settle();
    });

    // --- Wheel: pinch zoom, trackpad pan, mouse-notch zoom ---
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const unit = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 400 : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;

      if (e.ctrlKey || e.metaKey) {
        stop();
        const t = transformRef.current;
        const p = toLocal(e.clientX, e.clientY);
        const s = softClampScale(t.scale * wheelZoomFactor(dy));
        write(zoomAround(t, s, p.x, p.y));
        scheduleSettle();
        return;
      }
      if (isMouseWheel(e)) {
        zoomBy(dy < 0 ? WHEEL_STEP : 1 / WHEEL_STEP, e.clientX, e.clientY);
        return;
      }
      stop();
      const t = transformRef.current;
      write(clampToBounds({ scale: t.scale, x: t.x - dx, y: t.y - dy }, boundsAt(t.scale)));
    };

    // --- Safari trackpad pinch arrives as proprietary gesture events instead of ctrl+wheel ---
    let gestureStart: ZoomPanTransform | null = null;
    type GestureEvent = UIEvent & { scale: number; clientX: number; clientY: number };
    const handleGestureStart = (e: Event) => {
      e.preventDefault();
      stop();
      gestureStart = transformRef.current;
    };
    const handleGestureChange = (e: Event) => {
      e.preventDefault();
      if (!gestureStart) return;
      const g = e as GestureEvent;
      const p = toLocal(g.clientX, g.clientY);
      const s = softClampScale(gestureStart.scale * g.scale);
      write(zoomAround(transformRef.current, s, p.x, p.y));
    };
    const handleGestureEnd = (e: Event) => {
      e.preventDefault();
      gestureStart = null;
      settle();
    };

    // --- Pointers: one drags, two pinch ---
    const pointers = new Map<number, Pointer>();
    let gesture: Gesture | null = null;
    let bounds: PanBounds = { x: 0, y: 0 };
    const view = () => ({ width: viewport.clientWidth, height: viewport.clientHeight });

    const centroid = (): Pointer => {
      const pts = [...pointers.values()];
      return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    };
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const beginGesture = () => {
      stop();
      const t = transformRef.current;
      bounds = boundsAt(t.scale);
      if (pointers.size >= 2) {
        gesture = { start: t, origin: toLocal(centroid().x, centroid().y), distance: spread(), samples: [] };
      } else {
        const [only] = pointers.values();
        gesture = { start: t, origin: only, distance: 0, samples: [{ x: t.x, y: t.y, t: performance.now() }] };
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if ((e.target as Element).closest('button, a, input')) return;
      // Stops text selection and native image drag from starting under the cursor.
      if (e.pointerType === 'mouse') e.preventDefault();
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch {
        // The pointer was already released (or is synthetic); dragging still works while it stays inside.
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      viewport.dataset.dragging = '';
      beginGesture();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId) || !gesture) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size >= 2) {
        // Two pointers starting on the same pixel have no spread to scale against yet.
        if (gesture.distance <= 0) {
          gesture.distance = spread();
          return;
        }
        const mid = toLocal(centroid().x, centroid().y);
        const s = softClampScale(gesture.start.scale * (spread() / gesture.distance));
        const zoomed = zoomAround(gesture.start, s, gesture.origin.x, gesture.origin.y);
        write({ scale: s, x: zoomed.x + mid.x - gesture.origin.x, y: zoomed.y + mid.y - gesture.origin.y });
        return;
      }

      const v = view();
      const rawX = gesture.start.x + e.clientX - gesture.origin.x;
      const rawY = gesture.start.y + e.clientY - gesture.origin.y;
      const now = performance.now();
      gesture.samples.push({ x: rawX, y: rawY, t: now });
      while (gesture.samples.length > 2 && now - gesture.samples[0].t > VELOCITY_WINDOW) gesture.samples.shift();
      write({
        scale: gesture.start.scale,
        x: rubberBand(rawX, bounds.x, v.width),
        y: rubberBand(rawY, bounds.y, v.height),
      });
    };

    const glide = (vx: number, vy: number) => {
      let last = performance.now();
      const step = (now: number) => {
        const dt = now - last;
        last = now;
        const decay = Math.exp(-dt / GLIDE_TAU);
        vx *= decay;
        vy *= decay;
        const t = transformRef.current;
        const next = clampToBounds({ scale: t.scale, x: t.x + vx * dt, y: t.y + vy * dt }, bounds);
        write(next);
        // Hitting an edge ends the glide on that axis.
        if (next.x !== t.x + vx * dt) vx = 0;
        if (next.y !== t.y + vy * dt) vy = 0;
        frameRef.current = Math.hypot(vx, vy) > 0.02 ? requestAnimationFrame(step) : 0;
      };
      frameRef.current = requestAnimationFrame(step);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      const ended = gesture;
      if (pointers.size > 0) {
        // Lifting one finger of a pinch hands over to a drag with the other.
        const [rest] = pointers.values();
        gesture = { start: transformRef.current, origin: rest, distance: 0, samples: [] };
        bounds = boundsAt(transformRef.current.scale);
        return;
      }
      gesture = null;
      delete viewport.dataset.dragging;
      if (!ended) return;

      const t = transformRef.current;
      const s = clampScale(t.scale);
      const inside = clampToBounds(t, bounds);
      if (s !== t.scale || inside.x !== t.x || inside.y !== t.y || e.type === 'pointercancel' || isMotionDisabled()) {
        settle();
        return;
      }
      const [first] = ended.samples;
      const lastSample = ended.samples[ended.samples.length - 1];
      const dt = lastSample && first ? lastSample.t - first.t : 0;
      if (dt > 0 && performance.now() - lastSample.t < 50) {
        glide((lastSample.x - first.x) / dt, (lastSample.y - first.y) / dt);
      }
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    viewport.addEventListener('gesturestart', handleGestureStart);
    viewport.addEventListener('gesturechange', handleGestureChange);
    viewport.addEventListener('gestureend', handleGestureEnd);
    viewport.addEventListener('pointerdown', handlePointerDown);
    viewport.addEventListener('pointermove', handlePointerMove);
    viewport.addEventListener('pointerup', handlePointerUp);
    viewport.addEventListener('pointercancel', handlePointerUp);

    return () => {
      unsubscribeMotion();
      window.clearTimeout(settleTimer);
      stop();
      viewport.removeEventListener('wheel', handleWheel);
      viewport.removeEventListener('gesturestart', handleGestureStart);
      viewport.removeEventListener('gesturechange', handleGestureChange);
      viewport.removeEventListener('gestureend', handleGestureEnd);
      viewport.removeEventListener('pointerdown', handlePointerDown);
      viewport.removeEventListener('pointermove', handlePointerMove);
      viewport.removeEventListener('pointerup', handlePointerUp);
      viewport.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [enabled, viewport, content, write, stop, settle, toLocal, zoomBy, boundsAt]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      cancelAnimationFrame(scaleFrameRef.current);
      window.clearTimeout(settleTimerRef.current);
    },
    [],
  );

  return {
    viewportRef: setViewport,
    contentRef: setContent,
    scale,
    zoomLevel: `${Math.round(scale * 100)}%`,
    isZoomed: scale > 1.02,
    zoomTo,
    zoomBy,
    reset,
  };
}

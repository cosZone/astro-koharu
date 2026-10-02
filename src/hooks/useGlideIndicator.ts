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
import { type RefObject, useLayoutEffect, useRef } from 'react';

/** Hidden for less than this (the CSS fade-out), the indicator is still on screen and glides on. */
const FADE_OUT_MS = 180;

interface GlideController {
  moveTo(key: string | null): void;
  destroy(): void;
}

function feelForMotionLevel(): GlideFeel | null {
  const level = readMotionLevel();
  return level === 'reduced' ? null : GLIDE_FEELS[level];
}

/** `x` glides along a row (the nav pill, segmented thumbs), `y` down a column (menu highlights). */
export type GlideAxis = 'x' | 'y';

function createGlide(container: HTMLElement, indicator: HTMLElement, axis: GlideAxis): GlideController {
  let item: HTMLElement | null = null;
  let visible = false;
  let hiddenAt = Number.NEGATIVE_INFINITY;
  let feel: GlideFeel | null = null;
  let state: GlideState | null = null;
  let frame = 0;
  let lastTime = 0;

  // Spans are along the glide axis: left/right are top/bottom on `y`.
  const measure = (): Span | null => {
    const box = container.getBoundingClientRect();
    if (!item?.isConnected || box.width === 0) return null;
    const rect = item.getBoundingClientRect();
    if (axis === 'y') {
      const scale = box.height / container.offsetHeight || 1;
      const origin = box.top + container.clientTop * scale;
      return { left: (rect.top - origin) / scale, right: (rect.bottom - origin) / scale };
    }
    const scale = box.width / container.offsetWidth || 1;
    const origin = box.left + container.clientLeft * scale;
    return { left: (rect.left - origin) / scale, right: (rect.right - origin) / scale };
  };

  const paint = ({ left, right }: Span) => {
    const size = `${Math.max(right - left, 0)}px`;
    if (axis === 'y') {
      indicator.style.translate = `0 ${left}px`;
      indicator.style.height = size;
    } else {
      indicator.style.translate = `${left}px 0`;
      indicator.style.width = size;
    }
  };

  const snap = () => {
    const target = measure();
    if (!target) return;
    state = glideAt(target);
    paint(target);
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
    paint(glideSpan(state, feel));
    frame = requestAnimationFrame(tick);
  };

  // Layout shifts outside a glide (fonts, breakpoints, a hidden drawer opening) re-seat the indicator.
  const observer = new ResizeObserver(() => {
    if (!frame) snap();
  });
  observer.observe(container);
  for (const element of container.querySelectorAll('[data-glide-key]')) observer.observe(element);

  const unsubscribeMotion = subscribeMotionLevel(() => {
    feel = feelForMotionLevel();
    if (!feel) {
      stop();
      snap();
    }
  });
  const onVisibility = () => {
    stop();
    if (!document.hidden) snap();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return {
    moveTo(key) {
      const now = performance.now();
      const onScreen = visible || now - hiddenAt < FADE_OUT_MS;
      visible = key !== null;
      indicator.dataset.visible = String(visible);
      if (key === null) {
        hiddenAt = now;
        return;
      }
      item = container.querySelector<HTMLElement>(`[data-glide-key="${CSS.escape(key)}"]`);
      feel = feelForMotionLevel();
      if (!onScreen || !feel || !state || document.hidden) {
        stop();
        snap();
        return;
      }
      if (!frame) {
        lastTime = now;
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
 * Springs `indicatorRef` onto the element marked `data-glide-key={activeKey}` inside `containerRef`.
 *
 * The indicator must be absolutely positioned at the container's padding edge where the axis starts
 * (left for `x`, top for `y`); this hook writes its `translate` and its `width` (`height` on `y`)
 * every frame without re-rendering, tracking the target's live box so it also follows items that
 * resize while it travels. `data-visible` flips to "false" when `activeKey` is null so CSS can fade
 * it out; it reappears on the next target without gliding.
 */
export function useGlideIndicator(
  containerRef: RefObject<HTMLElement | null>,
  indicatorRef: RefObject<HTMLElement | null>,
  activeKey: string | null,
  axis: GlideAxis = 'x',
) {
  const controllerRef = useRef<GlideController | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current || !indicatorRef.current) return;
    const controller = createGlide(containerRef.current, indicatorRef.current, axis);
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [containerRef, indicatorRef, axis]);

  useLayoutEffect(() => {
    controllerRef.current?.moveTo(activeKey);
  }, [activeKey]);
}

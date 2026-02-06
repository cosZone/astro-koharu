/**
 * Zoom and pan hook for fullscreen diagram/image viewers.
 * Handles wheel zoom, pinch zoom, mouse drag, and touch drag.
 *
 * Performance: Transform state lives in a ref and is flushed to React state
 * at most once per animation frame via rAF, avoiding excessive re-renders
 * during rapid input events (wheel, mousemove, touchmove).
 *
 * Uses a callback ref pattern so event listeners are registered reliably
 * even when the container is rendered inside a portal (e.g. FloatingPortal).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface ZoomPanState {
  scale: number;
  translateX: number;
  translateY: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const INITIAL_STATE: ZoomPanState = { scale: 1, translateX: 0, translateY: 0 };

export interface UseZoomPanReturn {
  containerRef: (node: HTMLDivElement | null) => void;
  state: ZoomPanState;
  reset: () => void;
  zoomTo: (targetScale: number, centerX?: number, centerY?: number) => void;
  zoomLevel: string;
}

export function useZoomPan(enabled = true): UseZoomPanReturn {
  const [state, setState] = useState<ZoomPanState>(INITIAL_STATE);

  // Track the viewport DOM element via state so the effect re-runs when it mounts/unmounts.
  // This solves timing issues with portals (FloatingPortal) where useRef.current is still
  // null when the initial useEffect fires.
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setViewport(node);
  }, []);

  // Live transform ref — updated synchronously by event handlers.
  // React state is flushed from this at most once per animation frame.
  const transformRef = useRef<ZoomPanState>(INITIAL_STATE);
  const rafRef = useRef(0);

  const flushState = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      setState(transformRef.current);
      rafRef.current = 0;
    });
  }, []);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Refs for drag state (don't need re-renders)
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastTranslateX: 0,
    lastTranslateY: 0,
    initialPinchDistance: 0,
    initialPinchScale: 1,
  });

  const reset = useCallback(() => {
    transformRef.current = INITIAL_STATE;
    // Reset should be immediate, cancel any pending rAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    setState(INITIAL_STATE);
  }, []);

  const zoomTo = useCallback(
    (targetScale: number, centerX?: number, centerY?: number) => {
      if (!viewport) return;
      const clamped = Math.min(Math.max(MIN_SCALE, targetScale), MAX_SCALE);
      const prev = transformRef.current;
      const rect = viewport.getBoundingClientRect();
      const cx = (centerX ?? rect.left + rect.width / 2) - rect.left - rect.width / 2;
      const cy = (centerY ?? rect.top + rect.height / 2) - rect.top - rect.height / 2;
      const factor = clamped / prev.scale;
      transformRef.current = {
        scale: clamped,
        translateX: cx - (cx - prev.translateX) * factor,
        translateY: cy - (cy - prev.translateY) * factor,
      };
      flushState();
    },
    [flushState, viewport],
  );

  useEffect(() => {
    if (!enabled || !viewport) return;

    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const prev = transformRef.current;
      const newScale = Math.min(Math.max(MIN_SCALE, prev.scale * delta), MAX_SCALE);
      const rect = viewport.getBoundingClientRect();
      const cursorX = e.clientX - rect.left - rect.width / 2;
      const cursorY = e.clientY - rect.top - rect.height / 2;
      const factor = newScale / prev.scale;
      transformRef.current = {
        scale: newScale,
        translateX: cursorX - (cursorX - prev.translateX) * factor,
        translateY: cursorY - (cursorY - prev.translateY) * factor,
      };
      flushState();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const d = dragRef.current;
      const s = transformRef.current;
      d.isDragging = true;
      d.startX = e.clientX;
      d.startY = e.clientY;
      d.lastTranslateX = s.translateX;
      d.lastTranslateY = s.translateY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d.isDragging) return;
      transformRef.current = {
        ...transformRef.current,
        translateX: d.lastTranslateX + (e.clientX - d.startX),
        translateY: d.lastTranslateY + (e.clientY - d.startY),
      };
      flushState();
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      const d = dragRef.current;
      const s = transformRef.current;
      if (e.touches.length === 2) {
        e.preventDefault();
        d.initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
        d.initialPinchScale = s.scale;
      } else if (e.touches.length === 1) {
        d.isDragging = true;
        d.startX = e.touches[0].clientX;
        d.startY = e.touches[0].clientY;
        d.lastTranslateX = s.translateX;
        d.lastTranslateY = s.translateY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const d = dragRef.current;
      if (e.touches.length === 2) {
        e.preventDefault();
        const newDist = getDistance(e.touches[0], e.touches[1]);
        const newScale = Math.min(Math.max(MIN_SCALE, d.initialPinchScale * (newDist / d.initialPinchDistance)), MAX_SCALE);
        transformRef.current = { ...transformRef.current, scale: newScale };
        flushState();
      } else if (e.touches.length === 1 && d.isDragging) {
        transformRef.current = {
          ...transformRef.current,
          translateX: d.lastTranslateX + (e.touches[0].clientX - d.startX),
          translateY: d.lastTranslateY + (e.touches[0].clientY - d.startY),
        };
        flushState();
      }
    };

    const handleTouchEnd = () => {
      dragRef.current.isDragging = false;
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    viewport.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    viewport.addEventListener('touchstart', handleTouchStart, { passive: false });
    viewport.addEventListener('touchmove', handleTouchMove, { passive: false });
    viewport.addEventListener('touchend', handleTouchEnd);

    return () => {
      viewport.removeEventListener('wheel', handleWheel);
      viewport.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      viewport.removeEventListener('touchstart', handleTouchStart);
      viewport.removeEventListener('touchmove', handleTouchMove);
      viewport.removeEventListener('touchend', handleTouchEnd);
    };
  }, [flushState, enabled, viewport]);

  return {
    containerRef,
    state,
    reset,
    zoomTo,
    zoomLevel: `${Math.round(state.scale * 100)}%`,
  };
}

import {
  boundLightboxTransform,
  type GesturePoint,
  LIGHTBOX_DRAG_THRESHOLD,
  LIGHTBOX_IDENTITY,
  type LightboxTransform,
  pointDistance,
  pointMidpoint,
  resolveLightboxSwipe,
  zoomLightboxAt,
} from '@lib/lightbox-gestures';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface LightboxGestureOptions {
  enabled: boolean;
  rotation: number;
  fitSize: { width: number; height: number };
  onClose: () => void;
  onNavigate: (direction: 1 | -1) => boolean;
}

interface GestureSession {
  pointers: Map<number, GesturePoint>;
  start: GesturePoint;
  transform: LightboxTransform;
  pinchDistance: number;
  pinchMidpoint: GesturePoint;
  moved: boolean;
  hadMultiple: boolean;
  startedOnImage: boolean;
  pointerType: string;
  mode: 'pending' | 'pan' | 'horizontal' | 'dismiss';
  startedAt: number;
}

function createSession(): GestureSession {
  return {
    pointers: new Map(),
    start: { x: 0, y: 0 },
    transform: LIGHTBOX_IDENTITY,
    pinchDistance: 0,
    pinchMidpoint: { x: 0, y: 0 },
    moved: false,
    hadMultiple: false,
    startedOnImage: false,
    pointerType: '',
    mode: 'pending',
    startedAt: 0,
  };
}

export function useImageLightboxGestures(options: LightboxGestureOptions) {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [state, setState] = useState(LIGHTBOX_IDENTITY);
  const [isInteracting, setIsInteracting] = useState(false);
  const optionsRef = useRef(options);
  const transformRef = useRef(LIGHTBOX_IDENTITY);
  const sessionRef = useRef(createSession());
  const rafRef = useRef(0);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ point: GesturePoint; time: number } | null>(null);
  const ignoreDoubleClickUntilRef = useRef(0);
  const containerRef = useCallback((node: HTMLDivElement | null) => setViewport(node), []);
  const imageRef = useCallback((node: HTMLImageElement | null) => setImage(node), []);

  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const commit = useCallback((transform: LightboxTransform, immediate = false) => {
    transformRef.current = transform;
    if (immediate) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      setState(transform);
    } else if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        setState(transformRef.current);
      });
    }
  }, []);

  const geometry = useCallback(
    () => ({
      viewportWidth: options.fitSize.width || (viewport?.clientWidth ?? 0),
      viewportHeight: options.fitSize.height || (viewport?.clientHeight ?? 0),
      imageWidth: image?.offsetWidth ?? 0,
      imageHeight: image?.offsetHeight ?? 0,
      rotation: optionsRef.current.rotation,
    }),
    [viewport, image, options.fitSize.width, options.fitSize.height],
  );

  const releasePointers = useCallback(() => {
    const session = sessionRef.current;
    const ids = Array.from(session.pointers.keys());
    session.pointers.clear();
    for (const id of ids) {
      if (viewport?.hasPointerCapture(id)) viewport.releasePointerCapture(id);
    }
    sessionRef.current = createSession();
    lastTapRef.current = null;
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = null;
  }, [viewport]);

  const reset = useCallback(() => {
    releasePointers();
    setIsInteracting(false);
    commit(LIGHTBOX_IDENTITY, true);
  }, [commit, releasePointers]);

  const zoomTo = useCallback(
    (targetScale: number, clientX?: number, clientY?: number) => {
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const anchor = {
        x: (clientX ?? rect.left + rect.width / 2) - rect.left - rect.width / 2,
        y: (clientY ?? rect.top + rect.height / 2) - rect.top - rect.height / 2,
      };
      commit(boundLightboxTransform(zoomLightboxAt(transformRef.current, targetScale, anchor), geometry()));
    },
    [viewport, commit, geometry],
  );

  // Toolbar/key repeats can arrive before React's next animation-frame render.
  const zoomBy = useCallback((factor: number) => zoomTo(transformRef.current.scale * factor), [zoomTo]);

  useEffect(() => {
    if (!viewport || !image || !options.enabled) return;

    const centered = (point: GesturePoint): GesturePoint => {
      const rect = viewport.getBoundingClientRect();
      return { x: point.x - rect.left - rect.width / 2, y: point.y - rect.top - rect.height / 2 };
    };
    const isImageTarget = (target: EventTarget | null) => target === image;
    const isControl = (target: EventTarget | null) =>
      target instanceof Element && target.closest('button, a, input, [data-lightbox-controls]');

    const beginPinch = () => {
      const session = sessionRef.current;
      const points = Array.from(session.pointers.values());
      session.hadMultiple = true;
      session.moved = true;
      session.transform = boundLightboxTransform(transformRef.current, geometry());
      session.pinchDistance = Math.max(1, pointDistance(points[0], points[1]));
      session.pinchMidpoint = centered(pointMidpoint(points[0], points[1]));
      setIsInteracting(true);
      commit(session.transform);
      lastTapRef.current = null;
    };

    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || isControl(event.target)) return;
      const session = sessionRef.current;
      if (session.pointers.size >= 2) return;
      const point = { x: event.clientX, y: event.clientY };
      if (!session.pointers.size) {
        session.start = point;
        session.transform = transformRef.current;
        session.startedOnImage = isImageTarget(event.target);
        session.pointerType = event.pointerType;
        session.startedAt = event.timeStamp;
      }
      session.pointers.set(event.pointerId, point);
      viewport.setPointerCapture(event.pointerId);
      if (session.pointers.size === 2) beginPinch();
    };

    const pointerMove = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session.pointers.has(event.pointerId)) return;
      const point = { x: event.clientX, y: event.clientY };
      session.pointers.set(event.pointerId, point);
      if (session.pointers.size === 2) {
        const points = Array.from(session.pointers.values());
        const scale = (session.transform.scale * pointDistance(points[0], points[1])) / session.pinchDistance;
        const transform = zoomLightboxAt(
          session.transform,
          scale,
          session.pinchMidpoint,
          centered(pointMidpoint(points[0], points[1])),
        );
        commit(boundLightboxTransform(transform, geometry()));
        return;
      }

      const delta = { x: point.x - session.start.x, y: point.y - session.start.y };
      if (!session.moved && Math.hypot(delta.x, delta.y) < LIGHTBOX_DRAG_THRESHOLD) return;
      session.moved = true;
      lastTapRef.current = null;
      if (session.mode === 'pending') {
        if (session.transform.scale > 1) session.mode = 'pan';
        else if (session.pointerType === 'touch' && !session.hadMultiple) {
          if (Math.abs(delta.x) > Math.abs(delta.y) * 1.2) session.mode = 'horizontal';
          else if (delta.y > 0 && delta.y > Math.abs(delta.x) * 1.2) session.mode = 'dismiss';
        }
      }
      setIsInteracting(true);
      if (session.mode === 'pan') {
        commit(
          boundLightboxTransform(
            {
              scale: session.transform.scale,
              translateX: session.transform.translateX + delta.x,
              translateY: session.transform.translateY + delta.y,
            },
            geometry(),
          ),
        );
      } else if (session.mode === 'horizontal') {
        commit({ scale: 1, translateX: Math.max(-180, Math.min(180, delta.x * 0.6)), translateY: 0 });
      } else if (session.mode === 'dismiss') {
        commit({ scale: 1, translateX: delta.x * 0.15, translateY: Math.max(0, delta.y * 0.85) });
      }
    };

    const finishPointer = (event: PointerEvent, canceled = false) => {
      const session = sessionRef.current;
      if (!session.pointers.has(event.pointerId)) return;
      session.pointers.delete(event.pointerId);
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      if (session.pointers.size) {
        // Rebase on the surviving finger, preserving the pinch transform and suppressing tap/swipe.
        const point = Array.from(session.pointers.values())[0];
        session.start = point;
        session.transform = transformRef.current;
        session.mode = session.transform.scale > 1 ? 'pan' : 'pending';
        return;
      }

      const delta = { x: event.clientX - session.start.x, y: event.clientY - session.start.y };
      const moved = session.moved || Math.hypot(delta.x, delta.y) >= LIGHTBOX_DRAG_THRESHOLD;
      const resolvedSwipe =
        !canceled && moved && !session.hadMultiple && session.pointerType === 'touch' && session.transform.scale === 1
          ? resolveLightboxSwipe(delta, event.timeStamp - session.startedAt, {
              width: viewport.clientWidth,
              height: viewport.clientHeight,
            })
          : null;
      const swipe =
        (session.mode === 'horizontal' && resolvedSwipe?.type === 'navigate') ||
        (session.mode === 'dismiss' && resolvedSwipe?.type === 'dismiss')
          ? resolvedSwipe
          : null;
      const endTarget = viewport.ownerDocument.elementFromPoint(event.clientX, event.clientY);
      const endedOnImage = isImageTarget(endTarget);
      sessionRef.current = createSession();
      setIsInteracting(false);
      // Keep a successful dismiss at the released pose for the viewer's exit animation.
      commit(swipe?.type === 'dismiss' ? transformRef.current : boundLightboxTransform(transformRef.current, geometry()), true);
      // A touch double tap can also emit dblclick; a completed drag can emit click as well.
      if (session.pointerType === 'touch' || moved) ignoreDoubleClickUntilRef.current = event.timeStamp + 500;

      if (canceled) {
        lastTapRef.current = null;
      } else if (swipe?.type === 'dismiss') {
        optionsRef.current.onClose();
      } else if (swipe?.type === 'navigate') {
        optionsRef.current.onNavigate(swipe.direction);
      } else if (!moved && !session.hadMultiple && !isControl(endTarget)) {
        if (!session.startedOnImage && !endedOnImage) optionsRef.current.onClose();
        else if (session.startedOnImage && endedOnImage && session.pointerType === 'touch') {
          const point = { x: event.clientX, y: event.clientY };
          const last = lastTapRef.current;
          if (last && event.timeStamp - last.time < 300 && pointDistance(last.point, point) < 24) {
            zoomTo(transformRef.current.scale > 1 ? 1 : 2.5, point.x, point.y);
            lastTapRef.current = null;
          } else lastTapRef.current = { point, time: event.timeStamp };
        }
      }
    };

    const pointerUp = (event: PointerEvent) => finishPointer(event);
    const pointerCancel = (event: PointerEvent) => finishPointer(event, true);
    const doubleClick = (event: MouseEvent) => {
      if (event.timeStamp < ignoreDoubleClickUntilRef.current) return;
      const target = viewport.ownerDocument.elementFromPoint(event.clientX, event.clientY);
      if (!isImageTarget(target) || isControl(target)) return;
      event.preventDefault();
      zoomTo(transformRef.current.scale > 1 ? 1 : 2.5, event.clientX, event.clientY);
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!event.deltaY || sessionRef.current.pointers.size) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
      const delta = Math.max(-100, Math.min(100, event.deltaY * unit));
      setIsInteracting(true);
      zoomTo(transformRef.current.scale * Math.exp(-delta * 0.002), event.clientX, event.clientY);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        wheelTimerRef.current = null;
        if (!sessionRef.current.pointers.size) setIsInteracting(false);
      }, 120);
    };
    const refreshBounds = () => commit(boundLightboxTransform(transformRef.current, geometry()));
    const observer = new ResizeObserver(refreshBounds);
    observer.observe(viewport);
    observer.observe(image);
    image.addEventListener('load', refreshBounds);
    viewport.addEventListener('pointerdown', pointerDown);
    viewport.addEventListener('pointermove', pointerMove);
    viewport.addEventListener('pointerup', pointerUp);
    viewport.addEventListener('pointercancel', pointerCancel);
    viewport.addEventListener('lostpointercapture', pointerCancel);
    viewport.addEventListener('dblclick', doubleClick);
    viewport.addEventListener('wheel', wheel, { passive: false });
    return () => {
      observer.disconnect();
      image.removeEventListener('load', refreshBounds);
      viewport.removeEventListener('pointerdown', pointerDown);
      viewport.removeEventListener('pointermove', pointerMove);
      viewport.removeEventListener('pointerup', pointerUp);
      viewport.removeEventListener('pointercancel', pointerCancel);
      viewport.removeEventListener('lostpointercapture', pointerCancel);
      viewport.removeEventListener('dblclick', doubleClick);
      viewport.removeEventListener('wheel', wheel);
      releasePointers();
      setIsInteracting(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [viewport, image, options.enabled, commit, geometry, releasePointers, zoomTo]);

  useLayoutEffect(() => {
    if (options.enabled) {
      commit(boundLightboxTransform(transformRef.current, { ...geometry(), rotation: options.rotation }));
    }
  }, [options.rotation, options.enabled, commit, geometry]);

  return {
    containerRef,
    imageRef,
    state,
    reset,
    zoomBy,
    zoomLevel: `${Math.round(state.scale * 100)}%`,
    isInteracting,
  };
}

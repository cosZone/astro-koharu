/**
 * Sizes the diagram SVG inside `container` through `--diagram-width` / `--diagram-height`
 * (and marks it `data-diagram-sized`): the fit scale from `getScaleRange` until the reader
 * picks one with the resize handle. Call `measure` after every render so the natural size
 * follows the SVG's viewBox.
 */

import { clampScale, type DiagramSize, getScaleRange, type ScaleRange } from '@lib/diagram-sizing';
import { readMotionLevel } from '@lib/motion-level';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

interface Frame {
  width: number;
  viewportHeight: number;
}

export interface DiagramZoom {
  scale: number;
  range: ScaleRange;
  naturalHeight: number;
}

const RESET_TIMING: KeyframeAnimationOptions = { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };

function readFrame(container: HTMLElement): Frame {
  const { paddingLeft, paddingRight } = getComputedStyle(container);
  return {
    width: container.clientWidth - Number.parseFloat(paddingLeft) - Number.parseFloat(paddingRight),
    viewportHeight: window.innerHeight,
  };
}

const toKeyframe = ({ width, height }: DiagramSize) => ({ width: `${width}px`, height: `${height}px` });

export function useDiagramScale(container: HTMLElement | null) {
  const [natural, setNatural] = useState<DiagramSize | null>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [userScale, setUserScale] = useState<number | null>(null);
  const appliedRef = useRef<DiagramSize | null>(null);

  useEffect(() => {
    if (!container) return;
    // Only a width change refits; sampling the viewport height with it keeps mobile toolbar resizes from reflowing the diagram.
    const observer = new ResizeObserver(() => {
      const next = readFrame(container);
      setFrame((prev) => (prev?.width === next.width ? prev : next));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  const range = natural && frame && frame.width > 0 ? getScaleRange(natural, frame.width, frame.viewportHeight) : null;
  const scale = range ? clampScale(userScale ?? range.fit, range) : null;

  useLayoutEffect(() => {
    if (!container || !natural || scale === null) return;
    const { scrollLeft, clientWidth, scrollWidth } = container;
    const center = scrollWidth > clientWidth ? (scrollLeft + clientWidth / 2) / scrollWidth : 0.5;
    const size = { width: natural.width * scale, height: natural.height * scale };
    container.style.setProperty('--diagram-width', `${size.width}px`);
    container.style.setProperty('--diagram-height', `${size.height}px`);
    container.dataset.diagramSized = '';
    appliedRef.current = size;
    if (container.scrollWidth > clientWidth) container.scrollLeft = center * container.scrollWidth - clientWidth / 2;
  }, [container, natural, scale]);

  const measure = useCallback(
    (svg: SVGSVGElement | null) => {
      const box = svg?.viewBox.baseVal;
      if (!container || !box?.width || !box.height) return;
      // Synchronous, so the first paint never shows the diagram stretched across the column.
      flushSync(() => {
        setNatural((prev) =>
          prev?.width === box.width && prev.height === box.height ? prev : { width: box.width, height: box.height },
        );
        setFrame((prev) => prev ?? readFrame(container));
      });
    },
    [container],
  );

  const reset = useCallback(() => {
    const from = appliedRef.current;
    flushSync(() => setUserScale(null));
    const to = appliedRef.current;
    const svg = container?.querySelector('svg');
    if (!svg || !from || !to || readMotionLevel() === 'reduced') return;
    if (from.width === to.width && from.height === to.height) return;
    svg.animate([toKeyframe(from), toKeyframe(to)], RESET_TIMING);
  }, [container]);

  const zoom: DiagramZoom | null = natural && range && scale !== null ? { scale, range, naturalHeight: natural.height } : null;
  return { zoom, setScale: setUserScale, reset, measure };
}

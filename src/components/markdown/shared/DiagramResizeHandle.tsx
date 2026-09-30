/**
 * Bottom-edge grip for resizing an in-article diagram (WAI-ARIA window splitter).
 * Drag or use the arrow keys to zoom; double-click or Enter restores the default size.
 */

import type { DiagramZoom } from '@hooks/useDiagramScale';
import { useTranslation } from '@hooks/useTranslation';
import { clampScale, stepScale } from '@lib/diagram-sizing';
import { cn } from '@lib/utils';
import { useRef, useState } from 'react';

interface DiagramResizeHandleProps extends DiagramZoom {
  onScaleChange: (scale: number) => void;
  onReset: () => void;
}

export function DiagramResizeHandle({ scale, range, naturalHeight, onScaleChange, onReset }: DiagramResizeHandleProps) {
  const { t } = useTranslation();
  const dragRef = useRef<{ startY: number; startScale: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const percent = Math.round(scale * 100);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startY: event.clientY, startScale: scale };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag) onScaleChange(clampScale(drag.startScale + (event.clientY - drag.startY) / naturalHeight, range));
  };

  const endDrag = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        onScaleChange(stepScale(scale, 1, range));
        break;
      case 'ArrowUp':
        onScaleChange(stepScale(scale, -1, range));
        break;
      case 'Home':
        onScaleChange(range.min);
        break;
      case 'End':
        onScaleChange(range.max);
        break;
      case 'Enter':
        onReset();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a focusable window splitter holds the grip and zoom badge, which a void <hr> cannot.
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="horizontal"
      aria-label={t('diagram.resize')}
      aria-valuemin={Math.round(range.min * 100)}
      aria-valuemax={Math.round(range.max * 100)}
      aria-valuenow={percent}
      aria-valuetext={`${percent}%`}
      title={t('diagram.resizeHint')}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      className="group/resize absolute bottom-0 left-1/2 z-10 flex h-6 w-24 -translate-x-1/2 cursor-ns-resize touch-none select-none items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden"
    >
      <span
        className={cn(
          'h-1 w-9 rounded-full bg-muted-foreground/30 transition-[width,background-color] duration-200 ease-out',
          'group-hover/resize:w-12 group-hover/resize:bg-muted-foreground/60 group-focus-visible/resize:w-12',
          isDragging && 'w-12 bg-primary group-hover/resize:bg-primary',
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute bottom-full mb-1 rounded-md border border-border bg-background/90 px-1.5 py-0.5',
          'font-mono text-[11px] text-muted-foreground tabular-nums shadow-sm backdrop-blur-sm',
          'opacity-0 transition-opacity duration-200 group-focus-visible/resize:opacity-100',
          isDragging && 'opacity-100',
        )}
      >
        {percent}%
      </span>
    </div>
  );
}

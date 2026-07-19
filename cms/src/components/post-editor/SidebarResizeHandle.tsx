import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from '@/components/post-editor/useSidebarResize';
import { cn } from '@/lib/utils';

interface SidebarResizeHandleProps {
  width: number;
  isResizing: boolean;
  onMouseDown: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLHRElement>) => void;
}

export function SidebarResizeHandle({ width, isResizing, onMouseDown, onKeyDown }: SidebarResizeHandleProps) {
  return (
    <hr
      tabIndex={0}
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      aria-valuenow={width}
      aria-valuetext={`${width} pixels`}
      className={cn(
        'h-full w-1 shrink-0 cursor-col-resize border-none transition-colors hover:bg-primary/50',
        isResizing && 'bg-primary',
      )}
      onMouseDownCapture={onMouseDown}
      onKeyDownCapture={onKeyDown}
    />
  );
}

import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useState } from 'react';

const SIDEBAR_WIDTH_KEY = 'cms-sidebar-width';
export const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_DEFAULT_WIDTH = 320;
export const SIDEBAR_MAX_WIDTH = 640;
const SIDEBAR_KEYBOARD_STEP = 16;

function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
}

export function useSidebarResize() {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const savedWidth = saved ? Number(saved) : SIDEBAR_DEFAULT_WIDTH;
    return Number.isFinite(savedWidth) ? clampSidebarWidth(savedWidth) : SIDEBAR_DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      setSidebarWidth(clampSidebarWidth(window.innerWidth - event.clientX));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, sidebarWidth]);

  const handleResizeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLHRElement>) => {
      let nextWidth: number | null = null;

      if (event.key === 'ArrowLeft') nextWidth = sidebarWidth + SIDEBAR_KEYBOARD_STEP;
      if (event.key === 'ArrowRight') nextWidth = sidebarWidth - SIDEBAR_KEYBOARD_STEP;
      if (event.key === 'Home') nextWidth = SIDEBAR_MIN_WIDTH;
      if (event.key === 'End') nextWidth = SIDEBAR_MAX_WIDTH;
      if (nextWidth === null) return;

      event.preventDefault();
      const clampedWidth = clampSidebarWidth(nextWidth);
      setSidebarWidth(clampedWidth);
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clampedWidth));
    },
    [sidebarWidth],
  );

  const startResizing = useCallback(() => setIsResizing(true), []);

  return { sidebarWidth, isResizing, startResizing, handleResizeKeyDown };
}

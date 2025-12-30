import { withFloatingErrorBoundary } from '@components/common/FloatingErrorBoundary';
import { zIndex } from '@constants/design-tokens';
import { FloatingPortal, type Placement, useDismiss, useFocus, useHover, useInteractions, useRole } from '@floating-ui/react';
import { useControlledState } from '@hooks/useControlledState';
import { useFloatingUI } from '@hooks/useFloatingUI';
// import { fontVariants } from '@constants/font';
import { cn } from '@lib/utils';
import React, { cloneElement, type JSX, useRef } from 'react';

type TooltipProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  offsetX?: number;
  title: React.ReactNode;
  placement?: Placement;
  children: JSX.Element;
  className?: string;
};

function Tooltip({ children, title, placement = 'top', offsetX = 5, className, open: passedOpen, onOpenChange }: TooltipProps) {
  const isBrowser = typeof window !== 'undefined';

  // Use useControlledState for open/close state management
  const [open, setOpen] = useControlledState({
    value: passedOpen,
    defaultValue: false,
    onChange: onOpenChange,
  });

  const arrowRef = useRef<HTMLElement>(null);

  // Use useFloatingUI with arrow support
  const { refs, context, x, y, strategy } = useFloatingUI({
    open,
    onOpenChange: setOpen,
    placement,
    offset: offsetX,
    flipFallbackDirection: 'start',
    arrowRef,
  });

  // Configure interactions for tooltip behavior
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { move: false }),
    useFocus(context),
    useDismiss(context),
    useRole(context, { role: 'tooltip' }),
  ]);

  // 如果不在浏览器环境，直接返回children
  if (!isBrowser) {
    return children;
  }
  return (
    <>
      {cloneElement(children, getReferenceProps({ ref: refs.setReference, ...children.props }))}
      <FloatingPortal id="floating-tooltip">
        {open && (
          <div
            className={cn(
              'z-10 rounded-lg border bg-background/80 px-3 py-1 text-card-foreground text-xs/3.5 backdrop-blur-lg',
              // ...fontVariants, // TODO: Font 迁移
              className,
            )}
            ref={refs.setFloating}
            style={{
              position: strategy,
              zIndex: zIndex.tooltip,
              top: y ?? 0,
              left: x ?? 0,
            }}
            {...getFloatingProps()}
          >
            {title}
          </div>
        )}
      </FloatingPortal>
    </>
  );
}

// Wrap with error boundary for graceful error handling
const TooltipWithErrorBoundary = withFloatingErrorBoundary(Tooltip, 'Tooltip');

export default TooltipWithErrorBoundary;

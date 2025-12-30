/**
 * useFloatingUI Hook
 *
 * Shared Floating UI configuration for consistent popover/tooltip positioning.
 * Wraps @floating-ui/react with sensible defaults and optional state management.
 *
 * @example
 * ```tsx
 * // Simple positioning only
 * function SimpleTooltip({ children, content }) {
 *   const { refs, floatingStyles } = useFloatingUI({
 *     placement: 'bottom',
 *     offset: 8
 *   });
 *
 *   return (
 *     <>
 *       <div ref={refs.setReference}>{children}</div>
 *       <div ref={refs.setFloating} style={floatingStyles}>
 *         {content}
 *       </div>
 *     </>
 *   );
 * }
 *
 * // With state management for interactions
 * function InteractivePopover({ open, onOpenChange }) {
 *   const { refs, floatingStyles, context } = useFloatingUI({
 *     open,
 *     onOpenChange,
 *     placement: 'bottom'
 *   });
 *
 *   const click = useClick(context);
 *   const dismiss = useDismiss(context);
 *   // ... use interactions
 * }
 * ```
 */

import {
  arrow,
  autoUpdate,
  flip,
  offset as offsetMiddleware,
  type Placement,
  shift,
  type UseFloatingReturn,
  useFloating as useFloatingBase,
} from '@floating-ui/react';
import { type RefObject, useMemo } from 'react';

export interface UseFloatingUIOptions {
  /** Placement of floating element relative to reference */
  placement?: Placement;
  /** Offset distance from reference element (in pixels) */
  offset?: number;
  /** Whether floating element should flip when it doesn't fit */
  enableFlip?: boolean;
  /** Whether floating element should shift to stay in view */
  enableShift?: boolean;
  /** Whether to use autoUpdate for positioning */
  autoUpdate?: boolean;
  /** Open state for stateful floating elements (popovers, tooltips) */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Disable transform CSS for better compatibility */
  transform?: boolean;
  /** Flip fallback direction */
  flipFallbackDirection?: 'start' | 'end';
  /** Arrow element ref for tooltip arrows */
  arrowRef?: RefObject<HTMLElement | null>;
}

/**
 * Hook for Floating UI with sensible defaults
 *
 * @param options - Floating UI options
 * @returns Floating UI instance with refs, styles, and context
 */
export function useFloatingUI({
  placement = 'bottom',
  offset = 8,
  enableFlip = true,
  enableShift = true,
  autoUpdate: enableAutoUpdate = true,
  open,
  onOpenChange,
  transform = true,
  flipFallbackDirection = 'end',
  arrowRef,
}: UseFloatingUIOptions = {}): UseFloatingReturn {
  // Build middleware array
  const middleware = useMemo(() => {
    const middlewares = [offsetMiddleware(offset)];

    if (enableShift) {
      middlewares.push(shift({ padding: 8 }));
    }

    // Arrow must come before flip for correct positioning
    if (arrowRef) {
      middlewares.push(arrow({ element: arrowRef }));
    }

    if (enableFlip) {
      middlewares.push(flip({ fallbackAxisSideDirection: flipFallbackDirection }));
    }

    return middlewares;
  }, [offset, enableFlip, enableShift, flipFallbackDirection, arrowRef]);

  // Configure floating
  const floating = useFloatingBase({
    placement,
    middleware,
    whileElementsMounted: enableAutoUpdate ? autoUpdate : undefined,
    open,
    onOpenChange,
    transform,
  });

  return floating;
}

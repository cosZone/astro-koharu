import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { animation } from '@constants/design-tokens';
import {
  FloatingFocusManager,
  FloatingPortal,
  type OpenChangeReason,
  type Placement,
  safePolygon,
  useClick,
  useDismiss,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { useControlledState } from '@hooks/useControlledState';
import { useFloatingUI } from '@hooks/useFloatingUI';
import { useMotionLevel } from '@hooks/useMotionLevel';
import { cn } from '@lib/utils';
import { AnimatePresence, type MotionProps, m } from 'motion/react';
import React, { cloneElement, useState } from 'react';

type PopoverProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  render: (data: { close: () => void }) => React.ReactNode;
  placement?: Placement;
  children: React.JSX.Element;
  className?: string;
  offset?: number;
  motionProps?: MotionProps;
  trigger?: 'click' | 'hover';
};

// Transform strings with one template at both ends, so Motion hands the entrance to WAAPI.
const RAISED = 'translateY(-4px) scale(0.96)';
const SETTLED = 'translateY(0px) scale(1)';
const LEAVING = 'translateY(-2px) scale(0.98)';

/** Enter or Space on the trigger. Hover events carry no click count either, so only clicks count. */
function isKeyboardOpen(event: Event | undefined, reason: OpenChangeReason | undefined) {
  if (reason !== 'click') return false;
  return event instanceof KeyboardEvent || (event instanceof MouseEvent && event.detail === 0);
}

function Popover({
  children,
  render,
  open: passedOpen,
  placement,
  onOpenChange,
  className,
  offset: offsetNum = 10,
  motionProps,
  trigger = 'click',
}: React.PropsWithChildren<PopoverProps>) {
  const motionDisabled = useMotionLevel() === 'reduced';
  // Use useControlledState for open/close state management
  const [isOpen, setIsOpen] = useControlledState({
    value: passedOpen,
    defaultValue: false,
    onChange: onOpenChange,
  });
  // Pointing at a hover menu leaves focus where it is; opening it from the keyboard (or tabbing into
  // it) moves focus in and, on close, back to the trigger.
  const [byKeyboard, setByKeyboard] = useState(false);
  const [triggerHalf, setTriggerHalf] = useState(0);

  // Use useFloatingUI for positioning logic
  const {
    refs,
    floatingStyles,
    context,
    placement: side,
  } = useFloatingUI({
    open: isOpen,
    onOpenChange: (open, event, reason) => {
      if (open) {
        setByKeyboard(isKeyboardOpen(event, reason));
        // Measured once per opening, so the transform origin never reads layout while rendering.
        setTriggerHalf((refs.domReference.current?.getBoundingClientRect().width ?? 0) / 2);
      }
      setIsOpen(open);
    },
    placement,
    offset: offsetNum,
    transform: false,
  });

  // Configure interaction hooks based on trigger type.
  // safePolygon: 指针从触发器移向浮层时给予安全区域宽限，避免仅依赖 150ms 关闭
  // 延迟——事件循环繁忙（或用户斜向移动稍慢）时浮层会在指针到达前被关闭。
  const hover = useHover(context, {
    enabled: trigger === 'hover',
    delay: { open: 0, close: animation.duration.fast },
    handleClose: safePolygon(),
  });
  // A hover menu still opens from the keyboard (and from a tap); mouse clicks leave it to hover.
  const click = useClick(context, { ignoreMouse: trigger === 'hover' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    click,
    useDismiss(context, { ancestorScroll: true }),
    useRole(context),
  ]);

  // Grow out from under the middle of the trigger.
  const transformOrigin = `${side.endsWith('end') ? `calc(100% - ${triggerHalf}px)` : `${triggerHalf}px`} ${side.startsWith('top') ? 'bottom' : 'top'}`;

  return (
    <LazyMotionProvider>
      {cloneElement(children, getReferenceProps({ ref: refs.setReference, ...children.props }))}
      <AnimatePresence>
        {isOpen && (
          <FloatingPortal>
            <FloatingFocusManager context={context} modal={false} initialFocus={byKeyboard ? 0 : -1} returnFocus={byKeyboard}>
              <m.div
                className={cn(
                  'z-30 overflow-hidden rounded-ss-2xl rounded-ee-2xl bg-popover/85 text-popover-foreground shadow-lg ring-1 ring-primary/15 backdrop-blur-xl',
                  className,
                )}
                {...motionProps}
                initial={motionDisabled ? false : (motionProps?.initial ?? { opacity: 0, transform: RAISED })}
                animate={
                  motionDisabled
                    ? { opacity: 1, transform: SETTLED }
                    : (motionProps?.animate ?? { opacity: 1, transform: SETTLED })
                }
                exit={
                  motionDisabled
                    ? { opacity: 0, transition: { duration: 0 } }
                    : (motionProps?.exit ?? {
                        opacity: 0,
                        transform: LEAVING,
                        transition: { duration: 0.14, ease: animation.bezier.inQuart },
                      })
                }
                transition={motionDisabled ? { duration: 0 } : (motionProps?.transition ?? animation.spring.popover)}
                style={{ ...floatingStyles, transformOrigin, ...motionProps?.style }}
                whileHover={motionDisabled ? undefined : motionProps?.whileHover}
                whileTap={motionDisabled ? undefined : motionProps?.whileTap}
                {...getFloatingProps({
                  ref: refs.setFloating,
                  onFocus: (event) => {
                    if (event.target instanceof Element && event.target.matches(':focus-visible')) setByKeyboard(true);
                  },
                })}
              >
                {render({ close: () => setIsOpen(false) })}
              </m.div>
            </FloatingFocusManager>
          </FloatingPortal>
        )}
      </AnimatePresence>
    </LazyMotionProvider>
  );
}

export default React.memo(Popover);

import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { animation } from '@constants/design-tokens';
import {
  FloatingFocusManager,
  FloatingPortal,
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
import { cn } from '@lib/utils';
import { AnimatePresence, type MotionProps, m } from 'motion/react';
import React, { cloneElement } from 'react';

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
  // Use useControlledState for open/close state management
  const [isOpen, setIsOpen] = useControlledState({
    value: passedOpen,
    defaultValue: false,
    onChange: onOpenChange,
  });

  // Use useFloatingUI for positioning logic
  const { refs, floatingStyles, context } = useFloatingUI({
    open: isOpen,
    onOpenChange: setIsOpen,
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
  const click = useClick(context, {
    enabled: trigger === 'click',
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    click,
    useDismiss(context, { ancestorScroll: true }),
    useRole(context),
  ]);

  return (
    <LazyMotionProvider>
      {cloneElement(children, getReferenceProps({ ref: refs.setReference, ...children.props }))}
      <AnimatePresence>
        {isOpen && (
          <FloatingPortal>
            <FloatingFocusManager context={context} modal={false}>
              <m.div
                className={cn(
                  'z-30 overflow-hidden rounded-ss-2xl rounded-ee-2xl bg-popover/85 text-popover-foreground shadow-lg ring-1 ring-primary/15 backdrop-blur-xl',
                  className,
                )}
                initial={{ opacity: 0, scale: 0.92, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.14, ease: animation.bezier.inQuart } }}
                transition={animation.spring.popover}
                style={{ ...floatingStyles, transformOrigin: placement?.endsWith('end') ? 'top right' : 'top left' }}
                {...motionProps}
                {...getFloatingProps({ ref: refs.setFloating })}
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

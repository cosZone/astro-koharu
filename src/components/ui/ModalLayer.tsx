/**
 * ModalLayer Component
 *
 * Shared shell for the fullscreen viewers (code, diagram, image lightbox).
 * Owns the portal, backdrop, focus trap, dismiss behavior (Esc + outside press),
 * enter/exit animation and closing on Astro page navigation, so each viewer only
 * has to render its own content.
 *
 * Body scroll lock lives in `@store/modal` (openModal/closeModal).
 */

import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { animation } from '@constants/design-tokens';
import { FloatingFocusManager, FloatingPortal, useDismiss, useFloating, useInteractions, useRole } from '@floating-ui/react';
import { useMotionLevel } from '@hooks/useMotionLevel';
import { cn } from '@lib/utils';
import { AnimatePresence, m } from 'motion/react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

const PANEL_CLASS =
  'relative flex h-[80vh] w-[90vw] max-w-6xl flex-col overflow-hidden overscroll-none rounded-xl bg-background shadow-2xl md:max-w-[90vw]';

export interface ModalLayerProps {
  open: boolean;
  onClose: () => void;
  /** `panel` centers children in an animated card; `fill` gives children the whole viewport layer. */
  variant?: 'panel' | 'fill';
  /** Extra classes for the floating element (the card in `panel`, the viewport layer in `fill`). */
  className?: string;
  backdropClassName?: string;
  /** Forwarded to Floating UI's `useDismiss`; return `false` to keep the modal open for that press. */
  outsidePress?: (event: MouseEvent) => boolean;
  children: ReactNode;
}

export function ModalLayer({
  open,
  onClose,
  variant = 'panel',
  className,
  backdropClassName,
  outsidePress,
  children,
}: ModalLayerProps) {
  const shouldReduceMotion = useMotionLevel() === 'reduced';
  const { refs, context } = useFloating({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
  });
  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown', outsidePress });
  const role = useRole(context, { role: 'dialog' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('astro:before-preparation', onClose);
    return () => document.removeEventListener('astro:before-preparation', onClose);
  }, [open, onClose]);

  const isPanel = variant === 'panel';

  return (
    <LazyMotionProvider>
      <FloatingPortal>
        <AnimatePresence>
          {open && (
            <m.div className={cn('fixed inset-0', isPanel ? 'z-40' : 'z-50')}>
              {/* Only the backdrop fades as a whole; the content owns its own entrance and exit. */}
              <m.div
                className={cn('fixed inset-0 backdrop-blur-sm', backdropClassName ?? 'bg-[rgb(18_10_26/0.72)]')}
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{
                  opacity: 0,
                  transition: shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: animation.bezier.inQuart },
                }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: animation.bezier.outQuart }}
              />
              <FloatingFocusManager context={context}>
                {isPanel ? (
                  <div className="fixed inset-0 z-50 grid place-items-center px-4">
                    <m.div
                      ref={refs.setFloating}
                      className={cn(PANEL_CLASS, className)}
                      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={
                        shouldReduceMotion
                          ? { opacity: 0, transition: { duration: 0 } }
                          : { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.16, ease: animation.bezier.inQuart } }
                      }
                      transition={shouldReduceMotion ? { duration: 0 } : animation.spring.popover}
                      {...getFloatingProps()}
                    >
                      {children}
                    </m.div>
                  </div>
                ) : (
                  <div
                    ref={refs.setFloating}
                    className={cn('fixed inset-0 flex items-center justify-center', className)}
                    {...getFloatingProps()}
                  >
                    {children}
                  </div>
                )}
              </FloatingFocusManager>
            </m.div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </LazyMotionProvider>
  );
}

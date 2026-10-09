/**
 * SearchDialog Component
 *
 * A search dialog with keyboard navigation for searching blog posts.
 * Integrates with Pagefind for static site search.
 */

import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { Dialog, DialogPortal } from '@components/ui/dialog';
import { animation } from '@constants/design-tokens';
import { useMotionLevel } from '@hooks/useMotionLevel';
import { useTranslation } from '@hooks/useTranslation';
import { useStore } from '@nanostores/react';
import { $isSearchOpen, closeModal } from '@store/modal';
import { AnimatePresence, m } from 'motion/react';
import { useCallback, useEffect } from 'react';

export default function SearchDialogContent() {
  const shouldReduceMotion = useMotionLevel() === 'reduced';
  const { t } = useTranslation();
  const isOpen = useStore($isSearchOpen);

  // Dispatch events for search component portal
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('search-dialog-open'));
      const focusSearch = () => {
        const searchInput = document.querySelector('.pf-searchbox-input') as HTMLInputElement;
        searchInput?.focus();
      };
      // SearchPortal moves the input on the next frame before it can receive focus.
      const focusFrame = shouldReduceMotion ? requestAnimationFrame(focusSearch) : 0;
      const focusTimer = shouldReduceMotion ? undefined : setTimeout(focusSearch, 150);

      return () => {
        clearTimeout(focusTimer);
        cancelAnimationFrame(focusFrame);
      };
    } else {
      window.dispatchEvent(new CustomEvent('search-dialog-close'));
    }
  }, [isOpen, shouldReduceMotion]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }, []);

  return (
    <LazyMotionProvider>
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogPortal forceMount>
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Overlay */}
                <m.div
                  className="fixed inset-0 z-54 bg-[rgb(18_10_26/0.5)] backdrop-blur-[3px]"
                  initial={shouldReduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{
                    opacity: 0,
                    transition: shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: animation.bezier.inQuart },
                  }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: animation.bezier.outQuart }}
                />

                {/* Dialog: anchored near the top so it grows downward as results arrive; above the mobile menu button. */}
                <m.div
                  className="fixed inset-0 z-55 flex items-start justify-center px-4 pt-[12dvh] md:px-3 md:pt-3"
                  onClick={handleBackgroundClick}
                  initial={shouldReduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
                >
                  <m.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('search.dialogTitle')}
                    className="search-dialog relative w-full max-w-2xl overflow-hidden rounded-2xl bg-gradient-start text-foreground shadow-[0_2rem_4rem_-1.5rem_rgb(233_84_107/0.35),0_0.75rem_1.5rem_-0.75rem_rgb(20_10_28/0.3)] ring-1 ring-primary/15"
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98, y: -12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0, transition: { duration: 0 } }
                        : { opacity: 0, scale: 0.98, y: -8, transition: { duration: 0.15, ease: animation.bezier.inQuart } }
                    }
                    transition={shouldReduceMotion ? { duration: 0 } : animation.spring.popover}
                  >
                    {/* The Pagefind searchbox is moved in here: its input is the header row, results flow below. */}
                    <div id="search-dialog-container" />

                    <button
                      type="button"
                      onClick={closeModal}
                      className="absolute top-3.5 right-3.5 rounded-md px-1.5 py-1 text-muted-foreground text-xs transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground"
                      aria-label={t('search.dialogClose')}
                    >
                      {/* .kbd sets display outside the utilities layer, so the wrapper carries the breakpoint. */}
                      <span className="md:hidden">
                        <kbd className="kbd">esc</kbd>
                      </span>
                      <span className="hidden md:inline">{t('search.dialogClose')}</span>
                    </button>

                    <div className="search-dialog-footer flex items-center justify-end gap-4 border-foreground/6 border-t px-4 py-2.5 text-muted-foreground text-xs md:hidden">
                      <span>
                        <kbd className="kbd">↑↓</kbd> {t('search.dialogSelect')}
                      </span>
                      <span>
                        <kbd className="kbd">↵</kbd> {t('search.dialogOpen')}
                      </span>
                    </div>
                  </m.div>
                </m.div>
              </>
            )}
          </AnimatePresence>
        </DialogPortal>
      </Dialog>
    </LazyMotionProvider>
  );
}

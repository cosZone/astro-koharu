/**
 * SearchDialog Component
 *
 * A search dialog with keyboard navigation for searching blog posts.
 * Integrates with Pagefind for static site search.
 */

import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { Dialog, DialogPortal } from '@components/ui/dialog';
import { animation } from '@constants/design-tokens';
import { useIsMounted } from '@hooks/useIsMounted';
import { useEscapeKey, useKeyboardShortcut } from '@hooks/useKeyboardShortcut';
import { useTranslation } from '@hooks/useTranslation';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $isSearchOpen, closeModal, openModal } from '@store/modal';
import { AnimatePresence, m } from 'motion/react';
import { useCallback, useEffect, useMemo } from 'react';

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>Search</title>
      <path d="M18.03 16.62 22.31 20.9 20.9 22.31 16.62 18.03A8.96 8.96 0 0 1 11 20a9 9 0 1 1 9-9 8.96 8.96 0 0 1-1.97 5.62Zm-2.01-.75A7 7 0 1 0 11 18a6.98 6.98 0 0 0 4.87-1.98l.15-.15Z" />
    </svg>
  );
}

export default function SearchDialog() {
  const { t } = useTranslation();
  const isOpen = useStore($isSearchOpen);

  // Cmd/Ctrl + K to open
  useKeyboardShortcut({
    key: 'k',
    modifiers: ['meta'],
    handler: () => openModal('search'),
  });

  // ESC to close
  useEscapeKey(() => {
    if (isOpen) closeModal();
  }, isOpen);

  // Dispatch events for search component portal
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('search-dialog-open'));
      // Focus search input after animation
      const focusTimer = setTimeout(() => {
        const searchInput = document.querySelector('.pf-searchbox-input') as HTMLInputElement;
        searchInput?.focus();
      }, 150);

      return () => clearTimeout(focusTimer);
    } else {
      window.dispatchEvent(new CustomEvent('search-dialog-close'));
    }
  }, [isOpen]);

  // Close before page navigation
  useEffect(() => {
    const handleBeforePreparation = () => closeModal();

    document.addEventListener('astro:before-preparation', handleBeforePreparation);
    return () => {
      document.removeEventListener('astro:before-preparation', handleBeforePreparation);
    };
  }, []);

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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2, ease: animation.bezier.inQuart } }}
                  transition={{ duration: 0.3, ease: animation.bezier.outQuart }}
                />

                {/* Dialog: anchored near the top so it grows downward as results arrive; above the mobile menu button. */}
                <m.div
                  className="fixed inset-0 z-55 flex items-start justify-center px-4 pt-[12dvh] md:px-3 md:pt-3"
                  onClick={handleBackgroundClick}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <m.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('search.dialogTitle')}
                    className="search-dialog relative w-full max-w-2xl overflow-hidden rounded-2xl bg-gradient-start text-foreground shadow-[0_2rem_4rem_-1.5rem_rgb(233_84_107/0.35),0_0.75rem_1.5rem_-0.75rem_rgb(20_10_28/0.3)] ring-1 ring-primary/15"
                    initial={{ opacity: 0, scale: 0.98, y: -12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -8, transition: { duration: 0.15, ease: animation.bezier.inQuart } }}
                    transition={animation.spring.popover}
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

/**
 * Search trigger button component
 */
export function SearchTrigger({ className }: { className?: string }) {
  const isMounted = useIsMounted();
  const { t } = useTranslation();

  // Only compute platform-specific shortcut after mount to avoid hydration mismatch
  const title = useMemo(() => {
    if (!isMounted) return undefined;
    const platform = navigator.userAgentData?.platform || navigator.userAgent;
    const isMac = /mac/i.test(platform);
    return t('search.searchShortcut', { shortcut: isMac ? '⌘K' : 'Ctrl+K' });
  }, [isMounted, t]);

  return (
    <button
      type="button"
      onClick={() => openModal('search')}
      className={cn(
        'size-10 flex-center cursor-pointer rounded-full transition-[background-color,scale] duration-200 ease-out-quart hover:bg-current/15 active:scale-90',
        className,
      )}
      aria-label={t('common.search')}
      title={title}
    >
      <SearchIcon className="size-7" />
    </button>
  );
}

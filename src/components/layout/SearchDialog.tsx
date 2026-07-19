/**
 * SearchDialog Component
 *
 * A search dialog with keyboard navigation for searching blog posts.
 * Integrates with Pagefind for static site search.
 */

import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { Dialog, DialogPortal } from '@components/ui/dialog';
import { useIsMounted } from '@hooks/useIsMounted';
import { useEscapeKey, useKeyboardShortcut } from '@hooks/useKeyboardShortcut';
import { useSearchKeyboardNav } from '@hooks/useSearchKeyboardNav';
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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>Close</title>
      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" />
    </svg>
  );
}

export default function SearchDialog() {
  const { t } = useTranslation();
  const isOpen = useStore($isSearchOpen);
  const { containerRef } = useSearchKeyboardNav(isOpen);

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
        const searchInput = document.querySelector('.pagefind-ui__search-input') as HTMLInputElement;
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
                  className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />

                {/* Dialog */}
                <m.div
                  className="fixed inset-0 z-50 grid place-items-center px-4"
                  onClick={handleBackgroundClick}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <m.div
                    className="w-full max-w-3xl overflow-auto rounded-xl bg-gradient-start text-foreground shadow-box"
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative p-6 md:p-3">
                      <div className="search-dialog">
                        {/* Header */}
                        <div className="relative mb-4 flex items-center justify-between">
                          <h2 className="flex items-center gap-2 font-semibold text-lg md:text-base">
                            <SearchIcon className="size-5 md:size-4" />
                            {t('search.dialogTitle')}
                          </h2>
                          <button
                            type="button"
                            onClick={closeModal}
                            className="flex size-8 items-center justify-center rounded-full bg-black/5 transition-colors duration-300 hover:bg-black/10 md:size-7 dark:bg-white/10 dark:hover:bg-white/20"
                            aria-label={t('search.dialogClose')}
                          >
                            <CloseIcon className="size-5 md:size-4" />
                          </button>
                        </div>

                        {/* Empty hint */}
                        <div
                          id="search-empty-hint"
                          className="search-empty-hint absolute inset-x-0 top-32 text-center text-sm opacity-60 md:top-28"
                        >
                          <p>{t('search.dialogHint')}</p>
                          <p className="mt-1 text-xs">
                            <kbd className="kbd">ESC</kbd> {t('search.dialogClose')}
                          </p>
                        </div>

                        {/* Search Content Area */}
                        <div className="vertical-scrollbar scroll-feather-mask -mx-6 h-[calc(80dvh-140px)] overflow-auto scroll-smooth px-6 pb-8 after:bottom-10 md:-mx-3 md:h-[calc(80dvh-120px)] md:px-3">
                          <div id="search-dialog-container" ref={containerRef} />
                        </div>
                      </div>

                      {/* Keyboard hints */}
                      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-4 bg-gradient-start px-4 pt-1 pb-4 text-black/50 text-xs dark:border-white/10 dark:text-white/50">
                        <span>
                          <kbd className="kbd">↑↓</kbd> {t('search.dialogSelect')}
                        </span>
                        <span>
                          <kbd className="kbd">Enter</kbd> {t('search.dialogOpen')}
                        </span>
                        <span>
                          <kbd className="kbd">ESC</kbd> {t('search.dialogClose')}
                        </span>
                      </div>
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
      className={cn('cursor-pointer transition duration-300 hover:scale-125', className)}
      aria-label={t('common.search')}
      title={title}
    >
      <SearchIcon className="size-8" />
    </button>
  );
}

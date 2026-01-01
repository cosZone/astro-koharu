/**
 * SearchDialog Component
 *
 * A search dialog with keyboard navigation for searching blog posts.
 * Integrates with Pagefind for static site search.
 */

import { Dialog, DialogPortal } from '@components/ui/dialog';
import { useIsMounted } from '@hooks/useIsMounted';
import { useEscapeKey, useKeyboardShortcut } from '@hooks/useKeyboardShortcut';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $isSearchOpen, closeModal, openModal } from '@store/modal';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>Search</title>
      <path d="M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z" />
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
  const isOpen = useStore($isSearchOpen);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsObserverRef = useRef<MutationObserver | null>(null);

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

  // Get selectable items (results + load more button)
  const getSelectableItems = useCallback((): HTMLElement[] => {
    const results = Array.from(document.querySelectorAll('.pagefind-ui__result')) as HTMLElement[];
    const loadMoreBtn = document.querySelector('.pagefind-ui__button') as HTMLElement | null;
    if (loadMoreBtn && loadMoreBtn.offsetParent !== null) {
      return [...results, loadMoreBtn];
    }
    return results;
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    const items = getSelectableItems();
    if (selectedIndex >= 0 && selectedIndex < items.length) {
      items[selectedIndex]?.removeAttribute('data-selected');
    }
    setSelectedIndex(-1);
  }, [selectedIndex, getSelectableItems]);

  // Select a result
  const selectResult = useCallback(
    (index: number) => {
      const items = getSelectableItems();
      if (items.length === 0) {
        setSelectedIndex(-1);
        return;
      }

      const newIndex = Math.max(-1, Math.min(index, items.length - 1));

      // Remove old selection
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        items[selectedIndex]?.removeAttribute('data-selected');
      }

      setSelectedIndex(newIndex);

      if (newIndex >= 0) {
        items[newIndex].setAttribute('data-selected', 'true');
        items[newIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        const searchInput = document.querySelector('.pagefind-ui__search-input') as HTMLInputElement;
        searchInput?.focus();
      }
    },
    [selectedIndex, getSelectableItems],
  );

  // Navigate to selected result
  const navigateToSelected = useCallback(() => {
    const items = getSelectableItems();
    if (selectedIndex < 0 || selectedIndex >= items.length) return;

    const selectedItem = items[selectedIndex];

    if (selectedItem.classList.contains('pagefind-ui__button')) {
      selectedItem.click();
      setSelectedIndex(-1);
      return;
    }

    const link = selectedItem.querySelector('.pagefind-ui__result-link') as HTMLAnchorElement;
    if (link?.href) {
      closeModal();
      window.location.href = link.href;
    }
  }, [selectedIndex, getSelectableItems]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectResult(selectedIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectResult(selectedIndex - 1);
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        navigateToSelected();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, selectResult, navigateToSelected]);

  // Setup mutation observer to clear selection when results change
  useEffect(() => {
    if (!isOpen) {
      resultsObserverRef.current?.disconnect();
      resultsObserverRef.current = null;
      return;
    }

    const container = document.getElementById('search-dialog-container');
    if (!container) return;

    resultsObserverRef.current = new MutationObserver(() => {
      clearSelection();
    });

    resultsObserverRef.current.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      resultsObserverRef.current?.disconnect();
      resultsObserverRef.current = null;
    };
  }, [isOpen, clearSelection]);

  // Dispatch events for search component portal
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('search-dialog-open'));
      // Focus search input after animation
      setTimeout(() => {
        const searchInput = document.querySelector('.pagefind-ui__search-input') as HTMLInputElement;
        searchInput?.focus();
      }, 150);
    } else {
      window.dispatchEvent(new CustomEvent('search-dialog-close'));
    }
  }, [isOpen]);

  // Close before page navigation
  useEffect(() => {
    const handleBeforePreparation = () => {
      if (isOpen) closeModal();
    };

    document.addEventListener('astro:before-preparation', handleBeforePreparation);
    return () => {
      document.removeEventListener('astro:before-preparation', handleBeforePreparation);
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    closeModal();
  }, []);

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPortal forceMount>
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Overlay */}
              <motion.div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />

              {/* Dialog */}
              <motion.div
                className="fixed inset-0 z-50 grid place-items-center px-4"
                onClick={handleBackgroundClick}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  className="w-full max-w-3xl overflow-auto rounded-xl bg-gradient-start shadow-box"
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
                          搜索文章
                        </h2>
                        <button
                          type="button"
                          onClick={handleClose}
                          className="flex size-8 items-center justify-center rounded-full bg-black/5 transition-colors duration-300 hover:bg-black/10 md:size-7 dark:bg-white/10 dark:hover:bg-white/20"
                          aria-label="关闭搜索"
                        >
                          <CloseIcon className="size-5 md:size-4" />
                        </button>
                      </div>

                      {/* Empty hint */}
                      <div
                        id="search-empty-hint"
                        className="search-empty-hint absolute inset-x-0 top-32 text-center text-sm opacity-60 md:top-28"
                      >
                        <p>输入关键词搜索博客文章</p>
                        <p className="mt-1 text-xs">
                          按 <kbd className="rounded bg-black/10 px-1.5 py-0.5 font-mono dark:bg-white/10">ESC</kbd> 关闭
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
                        <kbd className="kbd">↑↓</kbd> 选择
                      </span>
                      <span>
                        <kbd className="kbd">Enter</kbd> 打开
                      </span>
                      <span>
                        <kbd className="kbd">ESC</kbd> 关闭
                      </span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </DialogPortal>
    </Dialog>
  );
}

/**
 * Search trigger button component
 */
export function SearchTrigger({ className }: { className?: string }) {
  const isMounted = useIsMounted();

  // Only compute platform-specific shortcut after mount to avoid hydration mismatch
  const title = useMemo(() => {
    if (!isMounted) return undefined;
    // @ts-expect-error - userAgentData is not yet in TypeScript's lib.dom.d.ts
    const platform = navigator.userAgentData?.platform || navigator.userAgent;
    const isMac = /mac/i.test(platform);
    return `搜索 (${isMac ? '⌘K' : 'Ctrl+K'})`;
  }, [isMounted]);

  const handleClick = () => {
    openModal('search');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn('cursor-pointer transition duration-300 hover:scale-125', className)}
      aria-label="搜索"
      title={title}
    >
      <SearchIcon className="size-8" />
    </button>
  );
}

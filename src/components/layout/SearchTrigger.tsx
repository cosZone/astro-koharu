import { useIsMounted } from '@hooks/useIsMounted';
import { useTranslation } from '@hooks/useTranslation';
import { cn } from '@lib/utils';
import { openModal } from '@store/modal';
import { useMemo } from 'react';
import { preloadSearchDialog } from './SearchDialog';

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>Search</title>
      <path d="M18.03 16.62 22.31 20.9 20.9 22.31 16.62 18.03A8.96 8.96 0 0 1 11 20a9 9 0 1 1 9-9 8.96 8.96 0 0 1-1.97 5.62Zm-2.01-.75A7 7 0 1 0 11 18a6.98 6.98 0 0 0 4.87-1.98l.15-.15Z" />
    </svg>
  );
}

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
      onPointerEnter={preloadSearchDialog}
      onFocus={preloadSearchDialog}
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

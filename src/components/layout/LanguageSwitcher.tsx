/**
 * LanguageSwitcher Component
 *
 * Dropdown for switching between locales.
 * Uses i18n config to display available locales and navigates
 * to the locale-aware alternate URL.
 *
 * Derives currentPath from the live URL so it stays correct
 * after Astro View Transition navigations.
 */

import Popover from '@components/ui/popover';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { memo, useCallback, useSyncExternalStore } from 'react';
import { getAlternateUrl, getLocaleFromUrl, localeEntries } from '@/i18n';

/** Subscribe to pathname changes via Astro's `astro:page-load` event. */
function subscribePathname(callback: () => void) {
  document.addEventListener('astro:page-load', callback);
  return () => document.removeEventListener('astro:page-load', callback);
}

function getPathname() {
  return window.location.pathname;
}

function getServerPathname() {
  return '/';
}

interface LanguageSwitcherProps {
  /** Initial locale code from SSR (e.g., 'zh', 'en') */
  locale: string;
  className?: string;
}

const LanguageSwitcherComponent = ({ locale: _ssrLocale, className }: LanguageSwitcherProps) => {
  const currentPath = useSyncExternalStore(subscribePathname, getPathname, getServerPathname);

  // Derive locale from live URL so it stays in sync after View Transition navigations
  const locale = typeof window !== 'undefined' ? getLocaleFromUrl(currentPath) : _ssrLocale;

  // Find current locale label
  const currentLabel = localeEntries.find((l) => l.code === locale)?.label ?? locale;

  const renderDropdownContent = useCallback(
    () => (
      <div className="flex flex-col">
        {localeEntries.map((entry, index) => {
          const isActive = entry.code === locale;
          const targetUrl = getAlternateUrl(currentPath, entry.code);
          return (
            <a
              key={entry.code}
              href={targetUrl}
              className={cn(
                'group px-4 py-2 text-sm outline-hidden transition-colors duration-300 hover:bg-gradient-shoka-button',
                {
                  'rounded-ss-2xl': index === 0,
                  'rounded-ee-2xl': index === localeEntries.length - 1,
                  'bg-gradient-shoka-button text-muted': isActive,
                },
              )}
            >
              <div className="flex items-center gap-2 text-white transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white">
                {entry.label}
                {isActive && <Icon icon="ri:check-line" className="size-3.5" />}
              </div>
            </a>
          );
        })}
      </div>
    ),
    [locale, currentPath],
  );

  // Don't render if only one locale is configured
  if (localeEntries.length <= 1) {
    return null;
  }

  return (
    <Popover placement="bottom-end" trigger="hover" render={renderDropdownContent}>
      <button
        type="button"
        className={cn('cursor-pointer transition duration-300 hover:scale-110', className)}
        aria-label={`Language: ${currentLabel}`}
        aria-haspopup="true"
      >
        <Icon icon="ri:translate" className="size-8" />
      </button>
    </Popover>
  );
};

const LanguageSwitcher = memo(LanguageSwitcherComponent);

export default LanguageSwitcher;

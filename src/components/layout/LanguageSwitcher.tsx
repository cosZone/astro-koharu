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
    ({ close }: { close: () => void }) => (
      <div className="flex flex-col">
        {localeEntries.map((entry, index) => {
          const isActive = entry.code === locale;
          const targetUrl = getAlternateUrl(currentPath, entry.code);
          return (
            <a
              key={entry.code}
              href={targetUrl}
              onClick={close}
              className={cn(
                'group px-4 py-2 text-sm outline-none transition-colors duration-300 hover:bg-gradient-shoka-button focus-visible:bg-gradient-shoka-button',
                {
                  'rounded-ss-2xl': index === 0,
                  'rounded-ee-2xl': index === localeEntries.length - 1,
                  'bg-gradient-shoka-button': isActive,
                },
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-2 transition-[translate,color] duration-300 ease-out-expo group-hover:translate-x-1 group-hover:text-white group-focus-visible:text-white',
                  isActive ? 'text-white' : 'text-popover-foreground/85',
                )}
              >
                {entry.label}
                {isActive && (
                  <span className="inline-flex size-3.5 shrink-0 items-center justify-center">
                    <Icon icon="ri:check-line" className="size-3.5" />
                  </span>
                )}
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
        className={cn(
          'size-10 flex-center cursor-pointer rounded-full transition-[background-color,scale] duration-200 ease-out-quart hover:bg-current/15 active:scale-90',
          className,
        )}
        aria-label={`Language: ${currentLabel}`}
        aria-haspopup="true"
      >
        {/* 图标数据异步加载，固定尺寸容器保证 SSR/加载前后几何不变，避免 popover 重定位 */}
        <span className="inline-flex size-7 items-center justify-center">
          <Icon icon="ri:translate" className="size-7" />
        </span>
      </button>
    </Popover>
  );
};

const LanguageSwitcher = memo(LanguageSwitcherComponent);

export default LanguageSwitcher;

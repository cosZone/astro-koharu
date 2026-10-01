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
import { NavMenu } from './NavMenu';

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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LanguageSwitcherComponent = ({ locale: _ssrLocale, className, open, onOpenChange }: LanguageSwitcherProps) => {
  const currentPath = useSyncExternalStore(subscribePathname, getPathname, getServerPathname);

  // Derive locale from live URL so it stays in sync after View Transition navigations
  const locale = typeof window !== 'undefined' ? getLocaleFromUrl(currentPath) : _ssrLocale;

  // Find current locale label
  const currentLabel = localeEntries.find((l) => l.code === locale)?.label ?? locale;

  const renderDropdownContent = useCallback(
    ({ close }: { close: () => void }) => (
      <NavMenu
        items={localeEntries.map((entry) => ({
          key: entry.code,
          href: getAlternateUrl(currentPath, entry.code),
          label: entry.label,
          current: entry.code === locale,
        }))}
        onSelect={close}
      />
    ),
    [locale, currentPath],
  );

  // Don't render if only one locale is configured
  if (localeEntries.length <= 1) {
    return null;
  }

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      placement="bottom-end"
      trigger="hover"
      render={renderDropdownContent}
      className="nav-popover"
    >
      <button
        type="button"
        className={cn(
          'size-10 flex-center cursor-pointer rounded-full transition-[background-color,scale] duration-200 ease-out-quart hover:bg-current/15 active:scale-90',
          className,
        )}
        aria-label={`Language: ${currentLabel}`}
        aria-haspopup="true"
        aria-expanded={open}
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

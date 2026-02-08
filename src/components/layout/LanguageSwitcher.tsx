/**
 * LanguageSwitcher Component
 *
 * Dropdown for switching between locales.
 * Uses i18n config to display available locales and navigates
 * to the locale-aware alternate URL.
 *
 * NOTE: This component is created in Phase 1 but will be integrated
 * into Navigator in Phase 3 when [lang]/ mirror routes are created.
 */

import Popover from '@components/ui/popover';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { memo, useCallback, useState } from 'react';
import { getAlternateUrl, localeEntries } from '@/i18n';

interface LanguageSwitcherProps {
  /** Current locale code (e.g., 'zh', 'en') */
  locale: string;
  /** Current page pathname for generating alternate URLs */
  currentPath: string;
  className?: string;
}

const LanguageSwitcherComponent = ({ locale, currentPath, className }: LanguageSwitcherProps) => {
  const [isOpen, setIsOpen] = useState(false);

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
    <Popover open={isOpen} onOpenChange={setIsOpen} placement="bottom-end" trigger="hover" render={renderDropdownContent}>
      <button
        type="button"
        className={cn('cursor-pointer transition duration-300 hover:scale-110', className)}
        aria-label={`Language: ${currentLabel}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Icon icon="ri:translate-2" className="size-5" />
      </button>
    </Popover>
  );
};

const LanguageSwitcher = memo(LanguageSwitcherComponent);

export default LanguageSwitcher;

import Popover from '@components/ui/popover';
import type { Router } from '@constants/router';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { memo, useCallback, useState } from 'react';
import { defaultLocale, localizedPath, resolveNavName, stripLocaleFromPath, t } from '@/i18n';
import { NavIndicator } from './NavIndicator';

interface DropdownNavProps {
  item: Router;
  currentPath: string;
  className?: string;
  locale?: string;
  showIndicator?: boolean;
  onIntent?: () => void;
}

const DropdownNavComponent = ({
  item,
  currentPath,
  className,
  locale = defaultLocale,
  showIndicator = false,
  onIntent,
}: DropdownNavProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { icon, children } = item;
  const name = resolveNavName(item.nameKey, item.name, locale);

  const strippedPath = stripLocaleFromPath(currentPath);

  const renderDropdownContent = useCallback(
    () => (
      <div className="nav-dropdown flex flex-col">
        {children?.length
          ? children.map((child: Router, index) => {
              const childName = resolveNavName(child.nameKey, child.name, locale);
              const childUrl = child.path
                ? child.localeIndependent
                  ? child.path
                  : localizedPath(child.path, locale)
                : child.path;
              return (
                <a
                  key={child.path}
                  href={childUrl}
                  className={cn(
                    'group px-4 py-2 text-base outline-none transition-colors duration-300 hover:bg-gradient-shoka-button focus-visible:bg-gradient-shoka-button',
                    {
                      'rounded-ss-2xl': index === 0,
                      'rounded-ee-2xl': index === children.length - 1,
                      'bg-gradient-shoka-button': strippedPath === child.path,
                    },
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center gap-2 transition-[translate,color] duration-300 ease-out-expo group-hover:translate-x-1 group-hover:text-white group-focus-visible:text-white',
                      strippedPath === child.path ? 'text-white' : 'text-popover-foreground/85',
                    )}
                  >
                    {child.icon && <Icon icon={child.icon} className="size-4" />}
                    {childName}
                  </div>
                </a>
              );
            })
          : null}
      </div>
    ),
    [children, strippedPath, locale],
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} placement="bottom-start" trigger="hover" render={renderDropdownContent}>
      <button
        type="button"
        className={cn(
          'relative isolate inline-flex h-10 items-center py-2 pr-5 pl-3 text-base tracking-wider outline-none',
          className,
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t(locale, 'common.menuLabel', { name })}
        onPointerEnter={onIntent}
        onFocus={onIntent}
      >
        <NavIndicator show={showIndicator} />
        {icon && (
          <span className="mr-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
            <Icon icon={icon} className="h-4 w-4" />
          </span>
        )}
        {name}
        <Icon
          icon="ri:arrow-drop-down-fill"
          className={cn('absolute right-0 size-6 transition-transform duration-300 ease-out-expo', {
            'rotate-180': isOpen,
          })}
        />
      </button>
    </Popover>
  );
};

// Memoize component for performance
const DropdownNav = memo(DropdownNavComponent);

export default DropdownNav;

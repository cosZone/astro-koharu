import Popover from '@components/ui/popover';
import type { Router } from '@constants/router';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { memo, useCallback, useState } from 'react';
import { defaultLocale, localizedPath, resolveNavName, stripLocaleFromPath, t } from '@/i18n';

interface DropdownNavProps {
  item: Router;
  currentPath: string;
  className?: string;
  locale?: string;
}

const DropdownNavComponent = ({ item, currentPath, className, locale = defaultLocale }: DropdownNavProps) => {
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
              const childUrl = child.path ? localizedPath(child.path, locale) : child.path;
              return (
                <a
                  key={child.path}
                  href={childUrl}
                  className={cn(
                    'group px-4 py-2 text-base outline-hidden transition-colors duration-300 hover:bg-gradient-shoka-button',
                    {
                      'rounded-ss-2xl': index === 0,
                      'rounded-ee-2xl': index === children.length - 1,
                      'bg-gradient-shoka-button text-muted': strippedPath === child.path,
                    },
                  )}
                >
                  <div className="flex items-center gap-2 text-white transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white">
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
          'inline-flex h-10 items-center px-4 py-2 text-base tracking-wider',
          'relative after:absolute after:bottom-1 after:left-1/2 after:h-0.5 after:w-0',
          'after:-translate-x-1/2 after:bg-white after:transition-all after:duration-300 after:content-[""]',
          className,
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t(locale, 'common.menuLabel', { name })}
      >
        {icon && <Icon icon={icon} className="mr-1.5" />}
        {name}
        <Icon
          icon="ri:arrow-drop-down-fill"
          className={cn('absolute -right-1.5 size-6 transition-transform duration-300', {
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

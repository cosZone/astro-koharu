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
  /** `data-glide-key` the header's sliding pill targets. */
  glideKey?: string;
  onIntent?: () => void;
  onOpenChange?: (open: boolean) => void;
}

const DropdownNavComponent = ({
  item,
  currentPath,
  className,
  locale = defaultLocale,
  glideKey,
  onIntent,
  onOpenChange,
}: DropdownNavProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };
  const { icon, children } = item;
  const name = resolveNavName(item.nameKey, item.name, locale);

  const strippedPath = stripLocaleFromPath(currentPath);

  // Picking an item closes the menu first: the Navigator persists across the page swap, and an open
  // menu would stay open in a portal left behind on the old page.
  const renderDropdownContent = useCallback(
    ({ close }: { close: () => void }) => (
      <div className="nav-dropdown">
        {children?.length
          ? children.map((child: Router) => {
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
                  onClick={close}
                  aria-current={strippedPath === child.path ? 'page' : undefined}
                  className="nav-dropdown-item text-base"
                >
                  {child.icon && (
                    <span className="inline-flex size-4 shrink-0 items-center justify-center">
                      <Icon icon={child.icon} className="size-4" />
                    </span>
                  )}
                  {childName}
                </a>
              );
            })
          : null}
      </div>
    ),
    [children, strippedPath, locale],
  );

  return (
    <Popover
      open={isOpen}
      onOpenChange={handleOpenChange}
      placement="bottom-start"
      trigger="hover"
      render={renderDropdownContent}
      className="nav-popover"
    >
      <button
        type="button"
        className={cn('relative inline-flex h-10 items-center py-2 pr-5 pl-3 text-base tracking-wider outline-none', className)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t(locale, 'common.menuLabel', { name })}
        data-glide-key={glideKey}
        onPointerEnter={onIntent}
        onFocus={onIntent}
      >
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

import Popover from '@components/ui/popover';
import type { Router } from '@constants/router';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { memo, useCallback, useMemo } from 'react';
import { defaultLocale, localizedPath, resolveNavName, stripLocaleFromPath, t } from '@/i18n';
import { NavMenu, type NavMenuItem } from './NavMenu';

interface DropdownNavProps {
  item: Router;
  currentPath: string;
  className?: string;
  locale?: string;
  /** `data-glide-key` the header's sliding pill targets. */
  glideKey?: string;
  onIntent?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DropdownNavComponent = ({
  item,
  currentPath,
  className,
  locale = defaultLocale,
  glideKey,
  onIntent,
  open,
  onOpenChange,
}: DropdownNavProps) => {
  const { icon, children } = item;
  const name = resolveNavName(item.nameKey, item.name, locale);

  const strippedPath = stripLocaleFromPath(currentPath);

  const menuItems = useMemo<NavMenuItem[]>(
    () =>
      (children ?? []).flatMap((child) =>
        child.path
          ? [
              {
                key: child.path,
                href: child.localeIndependent ? child.path : localizedPath(child.path, locale),
                label: resolveNavName(child.nameKey, child.name, locale),
                icon: child.icon,
                current: strippedPath === child.path,
              },
            ]
          : [],
      ),
    [children, strippedPath, locale],
  );

  // Picking an item closes the menu first: the Navigator persists across the page swap, and an open
  // menu would stay open in a portal left behind on the old page.
  const renderDropdownContent = useCallback(
    ({ close }: { close: () => void }) => <NavMenu items={menuItems} onSelect={close} />,
    [menuItems],
  );

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      placement="bottom-start"
      trigger="hover"
      render={renderDropdownContent}
      className="nav-popover"
    >
      <button
        type="button"
        className={cn('relative inline-flex h-10 items-center py-2 pr-5 pl-3 text-base tracking-wider', className)}
        aria-expanded={open}
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
            'rotate-180': open,
          })}
        />
      </button>
    </Popover>
  );
};

// Memoize component for performance
const DropdownNav = memo(DropdownNavComponent);

export default DropdownNav;

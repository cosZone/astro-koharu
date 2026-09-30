/**
 * Navigator Component
 *
 * Navigation header with scroll-based visibility control.
 * Uses useScrollTrigger hook for optimized scroll handling.
 */

import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import ThemeToggle from '@components/theme/ThemeToggle';
import { RESERVED_ROUTES } from '@constants/router';
import { configuredSeriesSlugs, enabledSeriesSlugs, routers } from '@constants/site-config';
import { useIsTablet } from '@hooks/useMediaQuery';
import { useScrollTrigger } from '@hooks/useScrollTrigger';
import { Icon } from '@iconify/react';
import { filterNavItems } from '@lib/utils';
import { memo, useEffect, useRef, useState } from 'react';
import { defaultLocale, localizedPath, resolveNavName, stripLocaleFromPath } from '@/i18n';
import DropdownNav from './DropdownNav';
import LanguageSwitcher from './LanguageSwitcher';
import { NavIndicator } from './NavIndicator';
import { SearchTrigger } from './SearchDialog';

interface NavigatorProps {
  currentPath: string;
  locale?: string;
}

// Pre-filter navigation items at module load (config is static)
const filteredRouters = filterNavItems(routers, configuredSeriesSlugs, enabledSeriesSlugs, RESERVED_ROUTES);

const navKey = (item: (typeof filteredRouters)[number]) => item.name ?? item.path ?? item.nameKey ?? '';

// Icon component for navigation items - uses @iconify/react for dynamic icons.
// Icon data loads asynchronously (Iconify API); the fixed-size wrapper reserves
// space so late icon rendering does not shift nav geometry (which would yank
// hover-opened dropdowns out from under the cursor).
function NavIcon({ name }: { name: string }) {
  return (
    <span className="mr-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
      <Icon icon={name} className="h-4 w-4" />
    </span>
  );
}

interface ButtonLinkProps {
  url: string;
  label: string;
  isActive: boolean;
  showIndicator: boolean;
  onIntent: () => void;
  children: React.ReactNode;
}

function ButtonLink({ url, label, isActive, showIndicator, onIntent, children }: ButtonLinkProps) {
  return (
    <a
      href={url}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      onPointerEnter={onIntent}
      onFocus={onIntent}
      className="relative isolate flex items-center px-3 py-2 text-base tracking-wider outline-none"
    >
      <NavIndicator show={showIndicator} />
      {children}
    </a>
  );
}

const Navigator = memo(function Navigator({ currentPath, locale = defaultLocale }: NavigatorProps) {
  const { isBeyond, direction } = useScrollTrigger({
    triggerDistance: 0.45,
    throttleMs: 80,
  });

  const isTablet = useIsTablet();
  const strippedPath = stripLocaleFromPath(currentPath);
  const isPostPageMobile = isTablet && strippedPath.startsWith('/post/');

  const firstScrollRef = useRef(true);
  const [intent, setIntent] = useState<string | null>(null);
  const activeItem = filteredRouters.find((item) =>
    item.children?.length
      ? item.children.some((child) => child.path && strippedPath.startsWith(child.path))
      : item.path === strippedPath,
  );
  const activeKey = activeItem ? navKey(activeItem) : null;
  const indicatorKey = intent ?? activeKey;

  // Apply with-background class based on scroll position
  useEffect(() => {
    document.getElementById('site-header')?.classList.toggle('with-background', isBeyond);
  }, [isBeyond]);

  // Handle header visibility based on scroll
  useEffect(() => {
    const siteHeader = document.getElementById('site-header');
    const mobileMenuContainer = document.getElementById('mobile-menu-container');

    // Skip first scroll
    if (firstScrollRef.current) {
      firstScrollRef.current = false;
      return;
    }

    // Post page mobile: keep header visible during scroll
    if (isPostPageMobile) {
      // Ensure header is visible
      siteHeader?.classList.remove('-translate-y-full');
      mobileMenuContainer?.classList.remove('-translate-y-full');
      return;
    }

    // Normal behavior: hide on scroll down, show on scroll up
    if (direction === 'down') {
      siteHeader?.classList.add('-translate-y-full');
      mobileMenuContainer?.classList.add('-translate-y-full');
    } else if (direction === 'up') {
      siteHeader?.classList.remove('-translate-y-full');
      mobileMenuContainer?.classList.remove('-translate-y-full');
    }
  }, [direction, isPostPageMobile]);

  return (
    <div className="flex grow tablet:grow-0 items-center">
      {/* Desktop navigation */}
      <LazyMotionProvider>
        <nav
          className="flex tablet:hidden grow items-center"
          onPointerLeave={() => setIntent(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setIntent(null);
          }}
        >
          {filteredRouters.map((item) => {
            const displayName = resolveNavName(item.nameKey, item.name, locale);
            const key = navKey(item);
            if (item.children?.length) {
              return (
                <DropdownNav
                  key={item.path ?? item.name}
                  item={item}
                  currentPath={currentPath}
                  locale={locale}
                  showIndicator={indicatorKey === key}
                  onIntent={() => setIntent(key)}
                />
              );
            }
            if (!item.path || !displayName) return null;
            const localizedUrl = item.localeIndependent ? item.path : localizedPath(item.path, locale);
            return (
              <ButtonLink
                key={item.path}
                url={localizedUrl}
                label={displayName}
                isActive={item.path === strippedPath}
                showIndicator={indicatorKey === key}
                onIntent={() => setIntent(key)}
              >
                {item.icon && <NavIcon name={item.icon} />}
                {displayName}
              </ButtonLink>
            );
          })}
        </nav>
      </LazyMotionProvider>

      <div className="ml-auto flex items-center gap-2">
        <SearchTrigger />
        <div className="tablet:hidden flex-center">
          <LanguageSwitcher locale={locale} />
        </div>
        <ThemeToggle locale={locale} />
      </div>
    </div>
  );
});

export default Navigator;

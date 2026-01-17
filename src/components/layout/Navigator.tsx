/**
 * Navigator Component
 *
 * Navigation header with scroll-based visibility control.
 * Uses useScrollTrigger hook for optimized scroll handling.
 */

import ThemeToggle from '@components/theme/ThemeToggle';
import { RESERVED_ROUTES, routers } from '@constants/router';
import { configuredSeriesSlugs, enabledSeriesSlugs } from '@constants/site-config';
import { useScrollTrigger } from '@hooks/useScrollTrigger';
import { Icon } from '@iconify/react';
import { cn, filterNavItems } from '@lib/utils';
import { useEffect, useRef, useState } from 'react';
import DropdownNav from './DropdownNav';
import { SearchTrigger } from './SearchDialog';

interface NavigatorProps {
  currentPath: string;
}

// Pre-filter navigation items at module load (config is static)
const filteredRouters = filterNavItems(routers, configuredSeriesSlugs, enabledSeriesSlugs, RESERVED_ROUTES);

// Icon component for navigation items - uses @iconify/react for dynamic icons
function NavIcon({ name }: { name: string }) {
  return <Icon icon={name} className="mr-1.5 h-4 w-4" />;
}

// Button link component
interface ButtonLinkProps {
  url: string;
  label: string;
  isActive: boolean;
  children: React.ReactNode;
}

function ButtonLink({ url, label, isActive, children }: ButtonLinkProps) {
  return (
    <a
      href={url}
      aria-label={label}
      className={cn(
        'relative flex items-center px-3 py-2 text-base tracking-wider',
        'after:absolute after:bottom-1 after:left-1/2 after:block after:h-0.5 after:w-0 after:-translate-x-1/2 after:transition-all after:duration-300',
        'hover:after:w-9/12',
        isActive && 'after:w-9/12',
      )}
    >
      {children}
    </a>
  );
}

export default function Navigator({ currentPath }: NavigatorProps) {
  const { isBeyond, direction } = useScrollTrigger({
    triggerDistance: 0.45,
    throttleMs: 80,
  });

  const [isPostPageMobile, setIsPostPageMobile] = useState(false);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef = useRef(false);
  const firstScrollRef = useRef(true);

  // Check if on post page and mobile
  useEffect(() => {
    const checkPostPageMobile = () => {
      const isMobile = window.innerWidth <= 992;
      const isPostPage = window.location.pathname.startsWith('/post/');
      setIsPostPageMobile(isMobile && isPostPage);
    };

    checkPostPageMobile();
    window.addEventListener('resize', checkPostPageMobile);
    return () => window.removeEventListener('resize', checkPostPageMobile);
  }, []);

  // Apply with-background class based on scroll position
  useEffect(() => {
    const siteHeader = document.getElementById('site-header');
    if (siteHeader) {
      if (isBeyond) {
        siteHeader.classList.add('with-background');
      } else {
        siteHeader.classList.remove('with-background');
      }
    }
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
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }
      isScrollingRef.current = true;

      // Ensure header is visible
      siteHeader?.classList.remove('-translate-y-full');
      mobileMenuContainer?.classList.remove('-translate-y-full');

      scrollEndTimerRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 800);
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex grow tablet:grow-0 items-center">
      {/* Desktop navigation */}
      <div className="flex tablet:hidden grow items-center">
        {filteredRouters.map((item) => {
          if (item.children?.length) {
            return <DropdownNav key={item.path ?? item.name} item={item} />;
          }
          if (!item.path || !item.name) return null;
          return (
            <ButtonLink key={item.path} url={item.path} label={item.name} isActive={item.path === currentPath}>
              {item.icon && <NavIcon name={item.icon} />}
              {item.name}
            </ButtonLink>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <SearchTrigger />
        <ThemeToggle />
      </div>
    </div>
  );
}

/**
 * Hook for header scroll behavior
 * Can be used by the parent Header component
 */
export function useHeaderScroll() {
  const { isBeyond, direction } = useScrollTrigger({
    triggerDistance: 0.45,
    throttleMs: 80,
  });

  const [isHidden, setIsHidden] = useState(false);
  const firstScrollRef = useRef(true);

  useEffect(() => {
    if (firstScrollRef.current) {
      firstScrollRef.current = false;
      return;
    }

    if (direction === 'down') {
      setIsHidden(true);
    } else if (direction === 'up') {
      setIsHidden(false);
    }
  }, [direction]);

  return {
    isHidden,
    hasBackground: isBeyond,
    direction,
  };
}

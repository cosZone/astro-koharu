/**
 * Navigator Component
 *
 * Navigation header with scroll-based visibility control.
 * Uses useScrollTrigger hook for optimized scroll handling.
 */

import ThemeToggle from '@components/theme/ThemeToggle';
import { routers } from '@constants/router';
import { useScrollTrigger } from '@hooks/useScrollTrigger';
import { cn } from '@lib/utils';
import { useEffect, useRef, useState } from 'react';
import DropdownNav from './DropdownNav';
import { SearchTrigger } from './SearchDialog';

interface NavigatorProps {
  currentPath: string;
}

// Icon component for navigation items
function NavIcon({ name }: { name: string }) {
  // Map icon names to inline SVGs (avoiding astro-icon dependency)
  const icons: Record<string, React.ReactNode> = {
    'fa6-solid:house-chimney': (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor" className="mr-1.5 h-4 w-4">
        <title>Home</title>
        <path d="M543.8 287.6c17 0 32-14 32-32.1c1-9-3-17-11-24L309.5 7c-6-5-14-7-21-7s-15 1-22 8L10 231.5c-7 7-10 15-10 24c0 18 14 32.1 32 32.1h32V448c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V287.6z" />
      </svg>
    ),
    'ri:newspaper-line': (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mr-1.5 h-4 w-4">
        <title>Weekly</title>
        <path d="M16 20V4H4V19C4 19.5523 4.44772 20 5 20H16ZM19 22H5C3.34315 22 2 20.6569 2 19V3C2 2.44772 2.44772 2 3 2H17C17.5523 2 18 2.44772 18 3V10H22V19C22 20.6569 20.6569 22 19 22ZM18 12V19C18 19.5523 18.4477 20 19 20C19.5523 20 20 19.5523 20 19V12H18ZM6 6H14V12H6V6ZM8 8V10H12V8H8ZM6 13H14V15H6V13ZM6 16H14V18H6V16Z" />
      </svg>
    ),
    'ri:quill-pen-ai-fill': (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mr-1.5 h-4 w-4">
        <title>Articles</title>
        <path d="M21 2C20.0034 4.66667 18.5104 6.33333 16.521 7C14.5316 7.66667 12.5316 6.83333 10.521 4.5L6.521 9.5C9.18767 11.1667 10.521 13 10.521 15C10.521 17 9.18767 18.8333 6.521 20.5L21 2ZM4.38916 18.0268C3.44883 19.5769 2.98307 20.6675 2.52122 21.8429C3.69771 21.3813 4.78876 20.9156 6.33929 19.9745C6.71108 19.7423 7.06621 19.4843 7.40177 19.2034L5.16276 16.9627C4.88195 17.2985 4.62158 17.6538 4.38916 18.0268Z" />
      </svg>
    ),
    'ri:links-line': (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mr-1.5 h-4 w-4">
        <title>Friends</title>
        <path d="M13.0605 8.11073L14.4747 9.52494C17.2084 12.2586 17.2084 16.6908 14.4747 19.4244L14.1211 19.778C11.3875 22.5117 6.95531 22.5117 4.22164 19.778C1.48797 17.0443 1.48797 12.6122 4.22164 9.87849L5.63585 11.2927C3.68323 13.2453 3.68323 16.4112 5.63585 18.3638C7.58847 20.3164 10.7543 20.3164 12.7069 18.3638L13.0605 18.0102C15.0131 16.0576 15.0131 12.8918 13.0605 10.9392L11.6463 9.52494L13.0605 8.11073ZM19.778 14.1211L18.3638 12.7069C20.3164 10.7543 20.3164 7.58847 18.3638 5.63585C16.4112 3.68323 13.2453 3.68323 11.2927 5.63585L10.9392 5.98949C8.98653 7.94211 8.98653 11.1079 10.9392 13.0605L12.3534 14.4747L10.9392 15.8889L9.52494 14.4747C6.79127 11.741 6.79127 7.30886 9.52494 4.57519L9.87849 4.22164C12.6122 1.48797 17.0443 1.48797 19.778 4.22164C22.5117 6.95531 22.5117 11.3875 19.778 14.1211Z" />
      </svg>
    ),
    'fa6-regular:circle-user': (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" className="mr-1.5 h-4 w-4">
        <title>About</title>
        <path d="M406.5 399.6C387.4 352.9 341.5 320 288 320H224c-53.5 0-99.4 32.9-118.5 79.6C69.9 362.2 48 311.7 48 256C48 141.1 141.1 48 256 48s208 93.1 208 208c0 55.7-21.9 106.2-57.5 143.6zm-40.1 32.7C334.4 452.4 296.6 464 256 464s-78.4-11.6-110.5-31.7c7.3-36.7 39.7-64.3 78.5-64.3h64c38.8 0 71.2 27.6 78.5 64.3zM256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-272a40 40 0 1 1 0-80 40 40 0 1 1 0 80zm-88-40a88 88 0 1 0 176 0 88 88 0 1 0 -176 0z" />
      </svg>
    ),
  };

  return icons[name] || null;
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
        {routers.map((item) => {
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

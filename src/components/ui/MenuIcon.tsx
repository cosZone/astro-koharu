/**
 * MenuIcon Component (Refactored)
 *
 * Hamburger menu icon with animated state transitions.
 *
 * Key improvements:
 * - Uses Nanostores instead of CustomEvent for state management
 * - Uses design tokens instead of hardcoded colors
 * - Cleaner and more maintainable code
 */

'use client';

import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { animation } from '@constants/design-tokens';
import { useMotionLevel } from '@hooks/useMotionLevel';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $isDrawerOpen, toggleDrawer } from '@store/modal';
import type { Variants } from 'motion/react';
import { m } from 'motion/react';

const lineVariants: Variants = {
  closed: {
    rotate: 0,
    y: 0,
    opacity: 1,
  },
  opened: (lineIndex: number) => {
    switch (lineIndex) {
      case 1:
        return {
          rotate: 45,
          y: 6,
          opacity: 1,
        };
      case 2:
        return {
          rotate: 0,
          y: 0,
          opacity: 0,
        };
      case 3:
        return {
          rotate: -45,
          y: -6,
          opacity: 1,
        };
      default:
        return {
          rotate: 0,
          y: 0,
          opacity: 1,
        };
    }
  },
};

interface MenuIconProps {
  className?: string;
  id?: string;
}

const MenuIcon = ({ className, id }: MenuIconProps) => {
  const isOpen = useStore($isDrawerOpen);
  const shouldReduceMotion = useMotionLevel() === 'reduced';

  return (
    <LazyMotionProvider>
      <div className={cn('flex-center', className)} id={id} style={{ viewTransitionName: 'home-menu-icon' }}>
        <button
          className="size-10 flex-center cursor-pointer select-none rounded-full bg-white/20 text-shoka"
          onClick={toggleDrawer}
          aria-label={isOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={isOpen}
          type="button"
          style={{
            viewTransitionName: 'menu-icon',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label={isOpen ? '关闭菜单' : '打开菜单'}
          >
            <m.g
              variants={lineVariants}
              initial={false}
              transition={shouldReduceMotion ? { duration: 0 } : animation.spring.menu}
              animate={isOpen ? 'opened' : 'closed'}
              custom={1}
              style={{ originX: 0.5, originY: 0.25 }}
            >
              <line x1="3" y1="6" x2="21" y2="6" />
            </m.g>
            <m.g
              variants={lineVariants}
              initial={false}
              transition={shouldReduceMotion ? { duration: 0 } : animation.spring.menu}
              animate={isOpen ? 'opened' : 'closed'}
              custom={2}
              style={{ originX: 0.5, originY: 0.5 }}
            >
              <line x1="3" y1="12" x2="21" y2="12" />
            </m.g>
            <m.g
              variants={lineVariants}
              initial={false}
              transition={shouldReduceMotion ? { duration: 0 } : animation.spring.menu}
              animate={isOpen ? 'opened' : 'closed'}
              custom={3}
              style={{ originX: 0.5, originY: 0.75 }}
            >
              <line x1="3" y1="18" x2="21" y2="18" />
            </m.g>
          </svg>
        </button>
      </div>
    </LazyMotionProvider>
  );
};

export { MenuIcon };

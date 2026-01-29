/**
 * CMSDashboardButton Component
 *
 * Floating button that opens the CMS Dashboard in a new tab.
 * Only rendered in development mode when CMS is enabled.
 */

import { useIsMounted } from '@hooks/useIsMounted';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $isDrawerOpen } from '@store/modal';
import { motion } from 'motion/react';

export function CMSDashboardButton() {
  const isMounted = useIsMounted();
  const isDrawerOpen = useStore($isDrawerOpen);

  // Hide when drawer is open
  const isHidden = isDrawerOpen;

  const handleClick = () => {
    window.open('/admin', '_self');
  };

  if (!isMounted) return null;

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      className={cn(
        'fixed top-20 right-4 z-50',
        'flex size-10 items-center justify-center rounded-full',
        'bg-linear-to-br from-primary to-primary/80 text-primary-foreground',
        'shadow-lg transition-transform hover:scale-105',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
      )}
      animate={{
        x: isHidden ? 200 : 0,
        opacity: isHidden ? 0 : 1,
        pointerEvents: isHidden ? 'none' : 'auto',
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      title="Open CMS Dashboard"
      aria-label="Open CMS Dashboard"
    >
      <Icon icon="ri:dashboard-3-line" className="size-5" />
    </motion.button>
  );
}

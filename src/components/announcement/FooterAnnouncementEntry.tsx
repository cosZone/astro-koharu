/**
 * FooterAnnouncementEntry Component
 *
 * Entry point in Footer to view all announcements.
 * Shows unread badge when there are unread announcements.
 */

import { useIsMounted } from '@hooks/useIsMounted';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { activeAnnouncements, openAnnouncementList, unreadCount } from '@store/announcement';
import { AnimatePresence, motion } from 'motion/react';

export default function FooterAnnouncementEntry() {
  const isMounted = useIsMounted();
  const count = useStore(unreadCount);
  const announcements = useStore(activeAnnouncements);

  // Don't render during SSR or if no active announcements
  if (!isMounted || announcements.length === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={openAnnouncementList}
      aria-expanded={false}
      aria-haspopup="dialog"
      className={cn(
        'relative flex items-center gap-1.5 opacity-75 transition-opacity duration-300 hover:opacity-100',
        'text-muted-foreground text-sm',
      )}
      title="View announcements"
    >
      <Icon icon="ri:notification-3-line" className="h-4 w-4" />
      <span>Announcements</span>

      {/* Unread badge - only show after mount to avoid hydration mismatch */}
      <AnimatePresence>
        {isMounted && count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={cn(
              'absolute -top-1 -right-2',
              'flex items-center justify-center',
              'h-4 min-w-[1rem] px-1',
              'bg-destructive text-destructive-foreground',
              'rounded-full font-medium text-xs',
            )}
          >
            {count > 9 ? '9+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

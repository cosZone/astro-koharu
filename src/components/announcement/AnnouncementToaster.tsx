/**
 * AnnouncementToaster Component
 *
 * Shows all unread announcements as Sonner toasts on initial load.
 * Each toast can be dismissed, which marks it as read.
 */

import { useRetimer } from '@hooks/useRetimer';
import { Icon } from '@iconify/react';
import { useStore } from '@nanostores/react';
import {
  announcementInitialized,
  announcementListOpen,
  markAsRead,
  openAnnouncementList,
  unreadAnnouncements,
} from '@store/announcement';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Announcement } from '@/types/announcement';

const HOVER_READ_DELAY = 1000; // ms before marking as read on hover

const typeStyles: Record<string, { color: string; icon: string }> = {
  info: { color: '#3b82f6', icon: 'ri:information-line' },
  warning: { color: '#eab308', icon: 'ri:alert-line' },
  success: { color: '#22c55e', icon: 'ri:checkbox-circle-line' },
  important: { color: '#ef4444', icon: 'ri:error-warning-line' },
};

export function getAnnouncementColor(announcement: Announcement): string {
  if (announcement.color) return announcement.color;
  const type = announcement.type ?? 'info';
  return typeStyles[type]?.color ?? typeStyles.info.color;
}

export function getAnnouncementIcon(announcement: Announcement): string {
  const type = announcement.type ?? 'info';
  return typeStyles[type]?.icon ?? typeStyles.info.icon;
}

function AnnouncementToastContent({ announcement }: { announcement: Announcement }) {
  const color = getAnnouncementColor(announcement);
  const icon = getAnnouncementIcon(announcement);

  return (
    <div className="flex w-full flex-col gap-2 border-l-4 pl-3" style={{ borderLeftColor: color }}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Icon icon={icon} className="h-4 w-4 shrink-0 opacity-70" />
        <span className="font-semibold text-sm">{announcement.title}</span>
      </div>

      {/* Content */}
      <p className="text-muted-foreground text-sm leading-relaxed">{announcement.content}</p>

      {/* Link */}
      {announcement.link && (
        <a
          href={announcement.link.url}
          target={announcement.link.external ? '_blank' : undefined}
          rel={announcement.link.external ? 'noopener noreferrer' : undefined}
          className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
        >
          {announcement.link.text ?? 'Learn more'}
          {announcement.link.external && <Icon icon="ri:external-link-line" className="h-3 w-3" />}
        </a>
      )}
    </div>
  );
}

function AnnouncementToast({ announcement, toastId }: { announcement: Announcement; toastId: string | number }) {
  const [isHovered, setIsHovered] = useState(false);
  const retimer = useRetimer();

  const handleMouseEnter = () => {
    setIsHovered(true);
    retimer(setTimeout(() => markAsRead(announcement.id), HOVER_READ_DELAY));
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <output
      className={`block w-full min-w-50 rounded-lg border border-border/50 bg-card/95 p-4 shadow-lg backdrop-blur-md transition-all duration-200 ${
        isHovered ? 'scale-[1.02] shadow-xl' : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnnouncementToastContent announcement={announcement} />
      <div className="mt-3 flex items-center justify-between border-border/50 border-t pt-2 text-muted-foreground text-xs">
        <button onClick={openAnnouncementList} className="text-primary hover:underline" type="button">
          View all
        </button>
        <button onClick={() => toast.dismiss(toastId)} className="opacity-70 hover:opacity-100" type="button">
          Dismiss
        </button>
      </div>
    </output>
  );
}

export default function AnnouncementToaster() {
  const initialized = useStore(announcementInitialized);
  const unread = useStore(unreadAnnouncements);
  const isListOpen = useStore(announcementListOpen);
  const shownRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Dismiss all toasts when the list popup opens
  useEffect(() => {
    if (isListOpen) {
      toast.dismiss();
    }
  }, [isListOpen]);

  useEffect(() => {
    // Wait for store to be initialized before showing toasts
    if (!initialized) return;

    // Show toasts for unread announcements that haven't been shown yet
    for (const announcement of unread) {
      if (shownRef.current.has(announcement.id)) continue;
      shownRef.current.add(announcement.id);

      // Delay to avoid blocking initial render
      const timer = setTimeout(
        () => {
          toast.custom((toastId) => <AnnouncementToast announcement={announcement} toastId={toastId} />, {
            id: announcement.id,
            duration: 5000, // Auto-dismiss after 5 seconds
          });
        },
        500 + unread.indexOf(announcement) * 200,
      ); // Stagger the toasts
      timersRef.current.push(timer);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [initialized, unread]);

  // Dismiss all toasts when user clicks outside
  useEffect(() => {
    if (!initialized) return;

    const handleDocumentClick = (e: MouseEvent) => {
      // Check if click is outside the toast container
      // Sonner's toast container has data-sonner-toaster attribute
      const toaster = document.querySelector('[data-sonner-toaster]');
      if (toaster && !toaster.contains(e.target as Node)) {
        toast.dismiss(); // Dismiss all toasts
      }
    };

    // Delay adding listener to avoid triggering on initial render
    const timer = setTimeout(() => {
      document.addEventListener('click', handleDocumentClick);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [initialized]);

  return null;
}

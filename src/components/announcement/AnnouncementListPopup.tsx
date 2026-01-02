/**
 * AnnouncementListPopup Component
 *
 * Timeline-style popup dialog showing all active announcements.
 * Triggered from Footer entry point.
 */

import { animation, zIndex } from '@constants/design-tokens';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import {
  activeAnnouncements,
  announcementListOpen,
  closeAnnouncementList,
  markAllAsRead,
  markAsRead,
  readAnnouncementIds,
} from '@store/announcement';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AnimatePresence, motion } from 'motion/react';
import type { Announcement } from '@/types/announcement';
import { getAnnouncementColor, getAnnouncementIcon } from './AnnouncementToaster';

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'MM/dd', { locale: zhCN });
  } catch {
    return '';
  }
}

function TimelineItem({
  announcement,
  isRead,
  isLast,
  nextColor,
}: {
  announcement: Announcement;
  isRead: boolean;
  isLast: boolean;
  nextColor?: string;
}) {
  const color = getAnnouncementColor(announcement);
  const icon = getAnnouncementIcon(announcement);
  const dateStr = formatDate(announcement.publishDate ?? announcement.startDate);

  const handleClick = () => {
    if (!isRead) {
      markAsRead(announcement.id);
    }
  };

  return (
    <div className="relative flex gap-2 md:gap-4">
      {/* Timeline column - fixed width */}
      <div className="relative flex w-10 shrink-0 flex-col items-center md:w-14">
        {/* Date */}
        <div className="mb-1.5 font-medium text-[10px] text-muted-foreground md:mb-2 md:text-xs">{dateStr}</div>

        {/* Dot */}
        <div
          className="relative z-10 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-card md:h-3 md:w-3 md:ring-[3px]"
          style={{ backgroundColor: color }}
        >
          {!isRead && (
            <span className="absolute inset-0 animate-ping rounded-full opacity-40" style={{ backgroundColor: color }} />
          )}
        </div>

        {/* Line to next item */}
        {!isLast && (
          <div
            className="mt-1 w-0.5 flex-1"
            style={{
              background: nextColor ? `linear-gradient(to bottom, ${color}50, ${nextColor}50)` : `${color}50`,
              minHeight: '1.5rem',
            }}
          />
        )}
      </div>

      {/* Card */}
      <button
        type="button"
        className={cn(
          'relative mb-3 flex-1 cursor-pointer overflow-hidden rounded-lg border border-border text-left transition-shadow md:mb-5 md:rounded-xl',
          isRead ? 'bg-muted/20 opacity-60' : 'bg-card shadow-sm hover:shadow-md',
        )}
        onClick={handleClick}
      >
        {/* Left accent */}
        <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />

        <div className="p-3 pl-4 md:p-4 md:pl-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-1.5 md:gap-2">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Icon icon={icon} className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" style={{ color }} />
              <h4 className="font-semibold text-xs md:text-sm">{announcement.title}</h4>
            </div>
            {!isRead && (
              <span
                className="shrink-0 rounded px-1 py-0.5 font-medium text-[10px] text-white md:px-1.5 md:text-xs"
                style={{ backgroundColor: color }}
              >
                新
              </span>
            )}
          </div>

          {/* Content */}
          <p className="mt-1.5 text-muted-foreground text-xs leading-relaxed md:mt-2 md:text-sm">{announcement.content}</p>

          {/* Link */}
          {announcement.link && (
            <a
              href={announcement.link.url}
              target={announcement.link.external ? '_blank' : undefined}
              rel={announcement.link.external ? 'noopener noreferrer' : undefined}
              className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs transition-all hover:gap-2 md:mt-3 md:px-3 md:py-1 md:text-sm"
              style={{ backgroundColor: `${color}15`, color }}
              onClick={(e) => e.stopPropagation()}
            >
              {announcement.link.text ?? '了解更多'}
              <Icon icon="ri:arrow-right-s-line" className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </a>
          )}
        </div>
      </button>
    </div>
  );
}

export default function AnnouncementListPopup() {
  const isOpen = useStore(announcementListOpen);
  const announcements = useStore(activeAnnouncements);
  const readIds = useStore(readAnnouncementIds);

  const unreadCount = announcements.filter((a) => !readIds.has(a.id)).length;
  const hasUnread = unreadCount > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: zIndex.modalBackdrop }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAnnouncementList}
          />

          {/* Popup */}
          <motion.div
            className="fixed inset-x-3 top-1/2 mx-auto max-w-lg overflow-hidden rounded-xl bg-card shadow-2xl md:inset-x-4 md:rounded-2xl"
            style={{ zIndex: zIndex.modal }}
            initial={{ opacity: 0, y: '-45%', scale: 0.95 }}
            animate={{ opacity: 1, y: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: '-45%', scale: 0.95 }}
            transition={animation.spring.default}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-border border-b bg-linear-to-r from-primary/5 to-transparent p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 md:h-10 md:w-10 md:rounded-xl">
                  <Icon icon="ri:notification-3-line" className="h-4 w-4 text-primary md:h-5 md:w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm md:text-base">公告</h3>
                  <p className="text-[10px] text-muted-foreground md:text-xs">
                    {announcements.length} 条公告
                    {hasUnread && <span className="text-primary"> · {unreadCount} 条未读</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                {hasUnread && (
                  <button
                    onClick={markAllAsRead}
                    className="rounded-md bg-primary/10 px-2 py-1 text-[10px] text-primary transition-colors hover:bg-primary/20 md:rounded-lg md:px-3 md:py-1.5 md:text-xs"
                    type="button"
                  >
                    全部已读
                  </button>
                )}
                <button
                  onClick={closeAnnouncementList}
                  className="rounded-md p-1.5 transition-colors hover:bg-black/5 md:rounded-lg md:p-2 dark:hover:bg-white/10"
                  aria-label="关闭"
                  type="button"
                >
                  <Icon icon="ri:close-line" className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto p-3 md:p-4">
              {announcements.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground md:py-12">
                  <Icon icon="ri:notification-off-line" className="mx-auto mb-2 h-12 w-12 opacity-20 md:mb-3 md:h-16 md:w-16" />
                  <p className="font-medium text-sm md:text-base">暂无公告</p>
                  <p className="mt-1 text-xs opacity-70 md:text-sm">有新公告时会在这里显示</p>
                </div>
              ) : (
                <div>
                  {announcements.map((announcement, index) => (
                    <TimelineItem
                      key={announcement.id}
                      announcement={announcement}
                      isRead={readIds.has(announcement.id)}
                      isLast={index === announcements.length - 1}
                      nextColor={index < announcements.length - 1 ? getAnnouncementColor(announcements[index + 1]) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

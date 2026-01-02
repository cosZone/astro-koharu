/**
 * Announcement State Management
 *
 * Nanostores-based state for the site announcement system.
 * Tracks read status via localStorage and provides computed stores
 * for active/unread announcements.
 */

import { announcements } from '@constants/announcements';
import { atom, computed } from 'nanostores';
import type { Announcement } from '@/types/announcement';

const STORAGE_KEY = 'announcement-read-ids';

/**
 * Set of read announcement IDs (persisted to localStorage)
 */
export const readAnnouncementIds = atom<Set<string>>(new Set());

/**
 * Whether the announcement system has been initialized
 */
export const announcementInitialized = atom<boolean>(false);

/**
 * Whether the announcement list popup is open
 */
export const announcementListOpen = atom<boolean>(false);

/**
 * Check if an announcement is currently active based on dates
 */
function isAnnouncementActive(announcement: Announcement): boolean {
  const now = new Date();

  if (announcement.startDate) {
    const start = new Date(announcement.startDate);
    if (now < start) return false;
  }

  if (announcement.endDate) {
    const end = new Date(announcement.endDate);
    if (now > end) return false;
  }

  return true;
}

/**
 * Computed: Active announcements (within date range, sorted by priority)
 */
export const activeAnnouncements = computed(readAnnouncementIds, () => {
  return announcements.filter(isAnnouncementActive).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
});

/**
 * Computed: Unread active announcements
 */
export const unreadAnnouncements = computed([activeAnnouncements, readAnnouncementIds], (active, readIds) => {
  return active.filter((a) => !readIds.has(a.id));
});

/**
 * Computed: Count of unread announcements
 */
export const unreadCount = computed(unreadAnnouncements, (unread) => unread.length);

/**
 * Load read IDs from localStorage
 */
function loadReadIds(): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const ids = JSON.parse(stored) as string[];
      readAnnouncementIds.set(new Set(ids));
    }
  } catch (e) {
    console.warn('[Announcement] Failed to parse stored read IDs', e);
  }
}

/**
 * Initialize announcement state from localStorage
 * Call this on page load
 */
export function initAnnouncementState(): void {
  loadReadIds();
  announcementInitialized.set(true);
}

/**
 * Mark an announcement as read and persist to localStorage
 */
export function markAsRead(id: string): void {
  const current = readAnnouncementIds.get();
  if (current.has(id)) return;

  const updated = new Set(current);
  updated.add(id);
  readAnnouncementIds.set(updated);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...updated]));
  }
}

/**
 * Open announcement list popup
 */
export function openAnnouncementList(): void {
  announcementListOpen.set(true);
}

/**
 * Close announcement list popup
 */
export function closeAnnouncementList(): void {
  announcementListOpen.set(false);
}

/**
 * Mark all active announcements as read
 */
export function markAllAsRead(): void {
  const active = activeAnnouncements.get();
  const updated = new Set(readAnnouncementIds.get());

  for (const announcement of active) {
    updated.add(announcement.id);
  }

  readAnnouncementIds.set(updated);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...updated]));
  }
}

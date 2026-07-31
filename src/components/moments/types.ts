export type MomentMediaKind = 'image' | 'video' | 'audio' | 'document' | 'animation' | 'sticker' | 'unknown';

export type MomentMediaStatus = 'ready' | 'pending' | 'unavailable';

export interface MomentChannelViewModel {
  id: string;
  slug: string;
  title: string;
  username?: string | null;
  href: string;
  isActive?: boolean;
}

export interface MomentMediaViewModel {
  id: string;
  kind: MomentMediaKind;
  cacheStatus: MomentMediaStatus;
  thumbnailUrl?: string | null;
  originalUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  alt?: string | null;
  sourceUrl?: string | null;
}

export interface MomentMessageViewModel {
  id: string;
  channel: MomentChannelViewModel;
  publishedAt: string;
  publishedLabel: string;
  revision: number;
  html: string;
  plainText?: string;
  permalink: string;
  sourceUrl?: string | null;
  media: MomentMediaViewModel[];
  showAllMedia?: boolean;
  tags: MomentTagViewModel[];
}

export interface MomentContextItemViewModel {
  href: string;
  publishedAt: string;
  publishedLabel: string;
  preview?: string | null;
}

export interface MomentTagViewModel {
  label: string;
  href: string;
}

export function formatMomentFileSize(bytes?: number | null): string | undefined {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024;
    unit = units[index];
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${unit}`;
}

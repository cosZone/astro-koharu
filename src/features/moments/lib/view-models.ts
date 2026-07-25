import type {
  MomentChannelViewModel,
  MomentContextItemViewModel,
  MomentMediaKind,
  MomentMediaViewModel,
  MomentMessageViewModel,
} from '@components/moments/types';
import type { MessageContextReference, PublicMedia, PublicMessage } from '@coszone/koharu-astro';
import type { NormalizedMomentsConfig, ResolvedMomentsChannel } from '@lib/config/moments';
import { displayDate } from '@lib/date';
import { getKoharuClient } from './runtime';
import { channelPath, messagePath } from './urls';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function mediaKind(kind: PublicMedia['kind']): MomentMediaKind {
  if (kind === 'photo') return 'image';
  if (kind === 'voice') return 'audio';
  return kind;
}

function parseFileSize(value: string | null): number | null {
  if (value === null) return null;
  const size = Number(value);
  return Number.isSafeInteger(size) && size >= 0 ? size : null;
}

function toMedia(media: PublicMedia): MomentMediaViewModel {
  const client = getKoharuClient();
  return {
    id: media.id,
    kind: mediaKind(media.kind),
    cacheStatus: media.cacheStatus,
    thumbnailUrl: client.resolveUrl(media.thumbnailUrl),
    originalUrl: client.resolveUrl(media.originalUrl),
    fileName: media.fileName,
    fileSize: parseFileSize(media.fileSize),
    mimeType: media.mimeType,
    alt: media.fileName,
  };
}

export function toChannelViewModel(
  config: NormalizedMomentsConfig,
  channel: ResolvedMomentsChannel,
  activeId?: string,
): MomentChannelViewModel {
  return {
    id: channel.id,
    slug: channel.slug,
    title: channel.title,
    username: channel.username,
    href: channelPath(config, channel),
    isActive: channel.id === activeId,
  };
}

export function toMessageViewModel(
  config: NormalizedMomentsConfig,
  channel: ResolvedMomentsChannel,
  message: PublicMessage,
): MomentMessageViewModel {
  const permalink = messagePath(config, channel, message.id);
  const plainText = message.content.text?.trim() || undefined;
  const html = message.content.html ?? (plainText ? `<p>${escapeHtml(plainText)}</p>` : '');
  return {
    id: message.id,
    channel: toChannelViewModel(config, channel),
    publishedAt: message.publishedAt,
    publishedLabel: displayDate.datetime(message.publishedAt),
    revision: message.revision,
    html,
    plainText,
    permalink,
    sourceUrl: message.sourceUrl,
    media: message.media.map(toMedia),
  };
}

export function toContextViewModel(
  config: NormalizedMomentsConfig,
  channel: ResolvedMomentsChannel,
  reference: MessageContextReference | null,
): MomentContextItemViewModel | undefined {
  if (!reference || reference.channelId !== channel.id) return undefined;
  return {
    href: messagePath(config, channel, reference.id),
    publishedAt: reference.publishedAt,
    publishedLabel: displayDate.datetime(reference.publishedAt),
    preview: reference.preview,
  };
}

export function messageTitle(message: PublicMessage, channel: ResolvedMomentsChannel): string {
  const text = message.content.text?.replace(/\s+/g, ' ').trim();
  if (text) return text.length > 64 ? `${text.slice(0, 63)}…` : text;
  return `${channel.title} · ${displayDate.datetime(message.publishedAt)}`;
}

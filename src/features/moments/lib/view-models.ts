import type {
  MomentChannelViewModel,
  MomentContextItemViewModel,
  MomentMediaKind,
  MomentMediaViewModel,
  MomentMessageViewModel,
  MomentTagViewModel,
} from '@components/moments/types';
import type { MessageContextReference, PublicMedia, PublicMessage } from '@coszone/koharu-astro';
import type { NormalizedMomentsConfig, ResolvedMomentsChannel } from '@lib/config/moments';
import { displayDate } from '@lib/date';
import { sanitizeKoharuContentHtml } from '@lib/sanitize';
import { type GroupMomentMessagesOptions, groupMomentMessages } from './message-groups';
import { getKoharuClient } from './runtime';
import { channelPath, messagePath, searchPath } from './urls';

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

const HASHTAG_PATTERN = /(?<![A-Za-z0-9_/&#])#([\p{L}\p{N}_]{2,32})/gu;
const MAX_TAGS = 8;

// Extract tags from existing plain text so every rendered chip opens a valid search query.
function toTags(config: NormalizedMomentsConfig, plainText?: string): MomentTagViewModel[] {
  if (!plainText) return [];
  const seen = new Set<string>();
  const tags: MomentTagViewModel[] = [];
  for (const match of plainText.matchAll(HASHTAG_PATTERN)) {
    const label = match[1];
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push({ label: `#${label}`, href: searchPath(config, { query: `#${label}` }) });
    if (tags.length >= MAX_TAGS) break;
  }
  return tags;
}

function toMedia(media: PublicMedia, sourceUrl: string | null): MomentMediaViewModel {
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
    sourceUrl,
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
  const html = sanitizeKoharuContentHtml(message.content.html, message.content.text);
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
    media: message.media.map((media) => toMedia(media, message.sourceUrl)),
    tags: toTags(config, plainText),
  };
}

export function toMessageViewModels(
  config: NormalizedMomentsConfig,
  channel: ResolvedMomentsChannel,
  messages: readonly PublicMessage[],
  options: GroupMomentMessagesOptions = {},
): MomentMessageViewModel[] {
  return groupMomentMessages(messages, options).map((group) => {
    const primary = toMessageViewModel(config, channel, group.primary);
    if (group.messages.length === 1) return primary;

    return {
      ...primary,
      media: group.messages.flatMap((message) => message.media.map((media) => toMedia(media, message.sourceUrl))),
      revision: Math.max(...group.messages.map((message) => message.revision)),
      showAllMedia: true,
    };
  });
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

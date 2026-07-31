import type { PublicMessage } from '@coszone/koharu-astro';

const TELEGRAM_ALBUM_LIMIT = 10;

export interface MomentMessageGroup {
  anchor: PublicMessage;
  messages: readonly PublicMessage[];
  primary: PublicMessage;
}

export interface GroupMomentMessagesOptions {
  /** The first API item may continue an album from the previous cursor page. */
  separateFirst?: boolean;
  /** The last API item may continue an album on the next cursor page. */
  separateLast?: boolean;
}

interface TelegramSourceMessage {
  channel: string;
  id: bigint;
}

function hasVisibleBody(message: PublicMessage): boolean {
  return Boolean(message.content.text?.trim() || message.content.html?.trim());
}

function telegramSourceMessage(message: PublicMessage): TelegramSourceMessage | undefined {
  if (!message.sourceUrl) return undefined;

  let url: URL;
  try {
    url = new URL(message.sourceUrl);
  } catch {
    return undefined;
  }

  if (url.protocol !== 'https:' || !['t.me', 'www.t.me'].includes(url.hostname.toLowerCase())) return undefined;
  const match = url.pathname.match(/^\/([^/]+)\/(\d+)\/?$/u);
  if (!match) return undefined;

  return {
    channel: match[1].toLowerCase(),
    id: BigInt(match[2]),
  };
}

function hasSameExplicitMediaGroup(messages: readonly PublicMessage[], candidate: PublicMessage): boolean {
  const mediaGroupId = messages[0]?.mediaGroupId;
  return Boolean(
    mediaGroupId &&
      candidate.mediaGroupId === mediaGroupId &&
      messages.every((message) => message.channel.id === candidate.channel.id),
  );
}

function stableGroupAnchor(messages: readonly PublicMessage[]): PublicMessage | undefined {
  const first = messages[0];
  if (!first) return undefined;
  const sources = messages.map(telegramSourceMessage);
  const firstSource = sources[0];
  if (firstSource && sources.every((source) => source?.channel === firstSource.channel)) {
    return messages.slice(1).reduce((anchor, candidate, index) => {
      const anchorSource = telegramSourceMessage(anchor);
      const candidateSource = sources[index + 1];
      return anchorSource && candidateSource && candidateSource.id < anchorSource.id ? candidate : anchor;
    }, first);
  }

  return messages
    .slice(1)
    .reduce((anchor, candidate) => (candidate.id.localeCompare(anchor.id) < 0 ? candidate : anchor), first);
}

function looksLikeDesktopAlbum(messages: readonly PublicMessage[], candidate: PublicMessage): boolean {
  const first = messages[0];
  const previous = messages.at(-1);
  if (!first || !previous || messages.length >= TELEGRAM_ALBUM_LIMIT) return false;
  if (candidate.mediaGroupId !== null || messages.some((message) => message.mediaGroupId !== null)) return false;
  if (candidate.channel.id !== first.channel.id || candidate.publishedAt !== first.publishedAt) return false;
  if (candidate.media.length === 0 || messages.some((message) => message.media.length === 0)) return false;

  const bodyCount = messages.filter(hasVisibleBody).length + Number(hasVisibleBody(candidate));
  if (bodyCount > 1) return false;

  const previousSource = telegramSourceMessage(previous);
  const candidateSource = telegramSourceMessage(candidate);
  if (!previousSource || !candidateSource || previousSource.channel !== candidateSource.channel) return false;

  const difference = candidateSource.id - previousSource.id;
  return difference === 1n || difference === -1n;
}

function toGroup(messages: readonly PublicMessage[]): MomentMessageGroup {
  const anchor = stableGroupAnchor(messages);
  if (!anchor) throw new TypeError('Moment message groups cannot be empty.');
  const primary = messages.find(hasVisibleBody) ?? anchor;
  return {
    anchor,
    messages,
    primary,
  };
}

function separateBoundaryGroups(groups: readonly PublicMessage[][], options: GroupMomentMessagesOptions): PublicMessage[][] {
  return groups.flatMap((messages, index) => {
    const isProtectedBoundary = (index === 0 && options.separateFirst) || (index === groups.length - 1 && options.separateLast);
    return isProtectedBoundary && messages.length > 1 ? messages.map((message) => [message]) : [messages];
  });
}

/**
 * Groups contiguous Telegram album members without changing their stable Suite identities.
 * Desktop JSON omits media_group_id, so the fallback deliberately requires every signal that
 * survives export: one timestamp, consecutive source IDs, media on every member, and at most one caption.
 */
export function groupMomentMessages(
  messages: readonly PublicMessage[],
  options: GroupMomentMessagesOptions = {},
): MomentMessageGroup[] {
  const groups: PublicMessage[][] = [];

  for (const message of messages) {
    const current = groups.at(-1);
    if (current && (hasSameExplicitMediaGroup(current, message) || looksLikeDesktopAlbum(current, message))) {
      current.push(message);
    } else {
      groups.push([message]);
    }
  }

  return separateBoundaryGroups(groups, options).map(toGroup);
}

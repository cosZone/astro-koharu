import type { NormalizedMomentsConfig, ResolvedMomentsChannel } from '@lib/config/moments';

function encodePathSegments(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function momentsPath(config: NormalizedMomentsConfig, suffix = ''): string {
  const prefix = encodePathSegments(config.path);
  const normalizedSuffix = suffix.replace(/^\/+/, '');
  return normalizedSuffix ? `/${prefix}/${normalizedSuffix}` : `/${prefix}`;
}

export function channelPath(config: NormalizedMomentsConfig, channel: ResolvedMomentsChannel): string {
  return momentsPath(config, encodeURIComponent(channel.slug));
}

export function messagePath(config: NormalizedMomentsConfig, channel: ResolvedMomentsChannel, messageId: string): string {
  return `${channelPath(config, channel)}/${encodeURIComponent(messageId)}`;
}

export function searchPath(
  config: NormalizedMomentsConfig,
  options: { channel?: string; query?: string; sort?: string } = {},
): string {
  const url = new URL(momentsPath(config, 'search'), 'https://moments.invalid');
  if (options.query) url.searchParams.set('q', options.query);
  if (options.channel) url.searchParams.set('channel', options.channel);
  if (options.sort && options.sort !== 'relevance') url.searchParams.set('sort', options.sort);
  return `${url.pathname}${url.search}`;
}

export function rssPath(config: NormalizedMomentsConfig, channel?: ResolvedMomentsChannel): string {
  return channel ? `${channelPath(config, channel)}/rss.xml` : momentsPath(config, 'rss.xml');
}

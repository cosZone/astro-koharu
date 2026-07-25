import type { PublicMessage } from '@coszone/koharu-astro';
import type { NormalizedMomentsConfig, ResolvedMomentsChannel } from '@lib/config/moments';
import { messageTitle } from './view-models';

export interface MomentsOpenGraphMetadata {
  description: string;
  image?: string;
  title: string;
  type: 'article' | 'website';
  url: string;
}

export function resolveMomentsOpenGraph(options: {
  canonical: string;
  channel?: ResolvedMomentsChannel;
  config: NormalizedMomentsConfig;
  kind: 'channel' | 'index' | 'message';
  message?: PublicMessage;
}): MomentsOpenGraphMetadata {
  const { canonical, channel, config, kind, message } = options;
  const title =
    kind === 'message' && message && channel
      ? messageTitle(message, channel)
      : kind === 'channel' && channel
        ? `${channel.title} · ${config.title}`
        : config.title;
  const rawDescription = kind === 'message' ? message?.content.text?.replace(/\s+/g, ' ').trim() : undefined;
  const description = rawDescription
    ? rawDescription.length > 180
      ? `${rawDescription.slice(0, 179)}…`
      : rawDescription
    : config.description;

  return {
    title,
    description,
    image: channel?.ogImage ?? config.ogImage,
    type: kind === 'message' ? 'article' : 'website',
    url: canonical,
  };
}

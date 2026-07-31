import rss from '@astrojs/rss';
import type { PublicMessage } from '@coszone/koharu-astro';
import type { NormalizedMomentsConfig, ResolvedMomentsChannel } from '@lib/config/moments';
import { groupMomentMessages } from './message-groups';
import { messagePath } from './urls';

export async function buildMomentsRss(options: {
  channels: readonly ResolvedMomentsChannel[];
  config: NormalizedMomentsConfig;
  description: string;
  hasMore?: boolean;
  messages: readonly PublicMessage[];
  site: URL;
  title: string;
}): Promise<Response> {
  const channelsById = new Map(options.channels.map((channel) => [channel.id, channel]));
  const response = await rss({
    title: options.title,
    description: options.description,
    site: options.site,
    trailingSlash: false,
    items: groupMomentMessages(options.messages, { separateLast: options.hasMore }).flatMap(({ anchor, primary }) => {
      const channel = channelsById.get(primary.channel.id);
      if (!channel) return [];
      const plain = primary.content.text?.replace(/\s+/g, ' ').trim();
      const title = plain ? (plain.length > 80 ? `${plain.slice(0, 79)}…` : plain) : `${channel.title} · 媒体消息`;
      return [
        {
          title,
          pubDate: new Date(anchor.publishedAt),
          description: plain ?? options.description,
          link: messagePath(options.config, channel, primary.id),
          content: primary.content.html ?? (plain ? `<p>${escapeXml(plain)}</p>` : undefined),
          customData: `<guid isPermaLink="false">urn:uuid:${anchor.id}</guid>`,
        },
      ];
    }),
  });
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'application/xml; charset=utf-8');
  return new Response(response.body, { status: response.status, headers });
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

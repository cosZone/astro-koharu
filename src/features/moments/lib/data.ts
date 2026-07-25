import { getLiveCollection } from 'astro:content';
import { RESERVED_ROUTES } from '@constants/router';
import { configuredSeriesSlugs, i18nConfig, momentsConfig } from '@constants/site-config';
import type { MessageContext, MessagePage, PublicChannel, SearchMessagePage, SearchMessageSort } from '@coszone/koharu-astro';
import { type ResolvedMomentsChannel, resolveMomentsChannels } from '@lib/config/moments';
import { getKoharuClient, requestKoharu } from './runtime';

export interface MomentsChannels {
  all: ResolvedMomentsChannel[];
  primary?: ResolvedMomentsChannel;
  visible: ResolvedMomentsChannel[];
}

export async function getMomentsChannels(): Promise<MomentsChannels> {
  if (!momentsConfig.enabled) return { all: [], visible: [] };

  const result = await requestKoharu('channels.list', async () => {
    const collection = await getLiveCollection('koharuChannels');
    if (collection.error) throw collection.error;
    return collection;
  });

  const suiteChannels = (result.entries ?? []).map((entry) => entry.data as PublicChannel);
  const all = resolveMomentsChannels(momentsConfig, suiteChannels, {
    localeCodes: i18nConfig.locales.flatMap((locale) => (locale.enabled === false ? [] : [locale.code])),
    reservedRoutes: RESERVED_ROUTES,
    seriesSlugs: configuredSeriesSlugs,
  });
  const visible = all.filter((channel) => !channel.hidden);
  return { all, visible, primary: visible.find((channel) => channel.primary) ?? visible[0] };
}

export function findChannel(channels: MomentsChannels, slug: string | undefined): ResolvedMomentsChannel | undefined {
  if (!slug) return undefined;
  return channels.visible.find((channel) => channel.slug === slug);
}

export async function listChannelMessages(channelId: string, cursor?: string, limit = 20): Promise<MessagePage> {
  return requestKoharu('messages.list', () =>
    getKoharuClient().messages.list({ channelId, ...(cursor ? { cursor } : {}), limit }),
  );
}

export async function latestMessages(channelIds: string[], limit = 20): Promise<MessagePage> {
  if (channelIds.length === 0) return { items: [], nextCursor: null };
  return requestKoharu('messages.latest', () => getKoharuClient().messages.latest({ channelIds, limit }));
}

export async function getMessageContext(messageId: string): Promise<MessageContext> {
  return requestKoharu('messages.context', () => getKoharuClient().messages.context({ messageId }));
}

export async function searchMessages(options: {
  channelIds: string[];
  cursor?: string;
  query: string;
  sort: SearchMessageSort;
}): Promise<SearchMessagePage> {
  if (options.channelIds.length === 0) return { items: [], mode: 'trigram', nextCursor: null };
  return requestKoharu('search.messages', () =>
    getKoharuClient().search.messages({
      channelIds: options.channelIds,
      ...(options.cursor ? { cursor: options.cursor } : {}),
      limit: 20,
      query: options.query,
      sort: options.sort,
    }),
  );
}

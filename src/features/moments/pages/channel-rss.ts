import { momentsConfig } from '@constants/site-config';
import type { APIRoute } from 'astro';
import { findChannel, getMomentsChannels, listChannelMessages } from '../lib/data';
import { buildMomentsRss } from '../lib/rss';
import { toMomentsHttpError } from '../lib/runtime';

export const GET: APIRoute = async (context) => {
  try {
    if (!context.site) throw new Error('Missing site metadata.');
    const channels = await getMomentsChannels();
    const channel = findChannel(channels, context.params.channel);
    if (!channel) {
      context.cache.set(false);
      return new Response('RSS channel not found', { status: 404 });
    }
    const page = await listChannelMessages(channel.id, undefined, 50);
    const response = await buildMomentsRss({
      channels: [channel],
      config: momentsConfig,
      description: momentsConfig.description,
      hasMore: Boolean(page.nextCursor),
      messages: page.items.slice(0, 50),
      site: context.site,
      title: `${channel.title} · ${momentsConfig.title}`,
    });
    context.cache.set({ maxAge: 300, swr: 30 });
    return response;
  } catch (error) {
    const failure = toMomentsHttpError(error);
    context.cache.set(false);
    const headers = new Headers({ 'Content-Type': 'text/plain; charset=utf-8' });
    if (failure.retryAfterSeconds !== undefined) headers.set('Retry-After', String(failure.retryAfterSeconds));
    return new Response(failure.type === 'rate-limited' ? 'RSS rate limited' : 'RSS temporarily unavailable', {
      status: failure.status,
      headers,
    });
  }
};

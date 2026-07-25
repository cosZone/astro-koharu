import { momentsConfig } from '@constants/site-config';
import type { APIRoute } from 'astro';

function replacePrefix(pathname: string): string | undefined {
  for (const alias of momentsConfig.pathAliases) {
    const prefix = `/${alias}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return `/${momentsConfig.path}${pathname.slice(prefix.length)}`;
    }
  }

  const canonicalPrefix = `/${momentsConfig.path}/`;
  if (!pathname.startsWith(canonicalPrefix)) return undefined;
  const remainder = pathname.slice(canonicalPrefix.length);
  const [candidate, ...tail] = remainder.split('/');
  for (const channel of momentsConfig.channels) {
    if (!channel.slug || !channel.aliases.includes(candidate)) continue;
    return `${canonicalPrefix}${channel.slug}${tail.length > 0 ? `/${tail.join('/')}` : ''}`;
  }
  return undefined;
}

export const GET: APIRoute = ({ url }) => {
  const targetPath = replacePrefix(url.pathname);
  if (!targetPath) return new Response('Not found', { status: 404 });
  const target = new URL(targetPath, url);
  target.search = url.search;
  return new Response(null, { status: 308, headers: { Location: `${target.pathname}${target.search}` } });
};

import type { NormalizedMomentsConfig } from '@lib/config/moments';
import type { AstroIntegration } from 'astro';

interface InjectedRoute {
  entrypoint: string;
  pattern: string;
}

function route(pattern: string, entrypoint: string): InjectedRoute {
  return { pattern: `/${pattern.replace(/^\/+|\/+$/g, '')}`, entrypoint };
}

function canonicalRoutes(prefix: string): InjectedRoute[] {
  const pages = './src/features/moments/pages';
  return [
    route(prefix, `${pages}/index.astro`),
    route(`${prefix}/search`, `${pages}/search.astro`),
    route(`${prefix}/rss.xml`, `${pages}/global-rss.ts`),
    route(`${prefix}/[channel]`, `${pages}/channel.astro`),
    route(`${prefix}/[channel]/rss.xml`, `${pages}/channel-rss.ts`),
    route(`${prefix}/[channel]/[message]`, `${pages}/message.astro`),
  ];
}

function aliasRoutes(config: NormalizedMomentsConfig): InjectedRoute[] {
  const redirect = './src/features/moments/pages/redirect.ts';
  const paths = config.pathAliases.flatMap((prefix) => [
    route(prefix, redirect),
    route(`${prefix}/search`, redirect),
    route(`${prefix}/rss.xml`, redirect),
    route(`${prefix}/[channel]`, redirect),
    route(`${prefix}/[channel]/rss.xml`, redirect),
    route(`${prefix}/[channel]/[message]`, redirect),
  ]);

  for (const channel of config.channels) {
    for (const alias of channel.aliases) {
      paths.push(route(`${config.path}/${alias}`, redirect));
      paths.push(route(`${config.path}/${alias}/rss.xml`, redirect));
      paths.push(route(`${config.path}/${alias}/[message]`, redirect));
    }
  }
  return paths;
}

export function momentsRoutes(config: NormalizedMomentsConfig): AstroIntegration {
  const injected = [...canonicalRoutes(config.path), ...aliasRoutes(config)];
  const patterns = new Set<string>();
  for (const item of injected) {
    if (patterns.has(item.pattern)) throw new Error(`Moments route collision at "${item.pattern}".`);
    patterns.add(item.pattern);
  }

  return {
    name: 'astro-koharu:moment-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        for (const item of injected) injectRoute({ ...item, prerender: false });
      },
      'astro:routes:resolved': ({ routes }) => {
        for (const item of injected) {
          const matches = routes.filter((candidate) => candidate.pattern === item.pattern);
          if (matches.length > 1) {
            throw new Error(`Moments route "${item.pattern}" conflicts with another Astro route.`);
          }
        }
      },
    },
  };
}

import type { MomentsChannelConfig, MomentsConfig, RouterItem } from './types';

const DEFAULT_PATH = 'moments';
const DEFAULT_TITLE = '碎碎念';
const DEFAULT_DESCRIPTION = '记录频道中的日常消息';
const DEFAULT_ICON = 'ri:chat-smile-3-fill';
const INTERNAL_CHANNEL_SLUGS = new Set(['search', 'rss.xml']);
const SAFE_SEGMENT = /^[a-z0-9][a-z0-9_-]*$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface MomentsValidationContext {
  reservedRoutes?: Iterable<string>;
  localeCodes?: Iterable<string>;
  seriesSlugs?: Iterable<string>;
}

export interface NormalizedMomentsChannelConfig extends Omit<MomentsChannelConfig, 'aliases'> {
  aliases: string[];
}

export interface NormalizedMomentsConfig {
  enabled: boolean;
  path: string;
  title: string;
  description: string;
  ogImage?: string;
  pathAliases: string[];
  channels: NormalizedMomentsChannelConfig[];
  /** Build-time URL names that runtime-discovered channel fallbacks cannot use. */
  channelSlugBlocklist: string[];
}

export interface SuiteChannel {
  id: string;
  title: string;
  username?: string | null;
}

export interface ResolvedMomentsChannel {
  id: string;
  slug: string;
  title: string;
  username?: string;
  primary: boolean;
  hidden: boolean;
  ogImage?: string;
  aliases: string[];
}

function lowerSet(values: Iterable<string> | undefined): Set<string> {
  return new Set(Array.from(values ?? [], (value) => value.toLowerCase()));
}

function configError(message: string): never {
  throw new Error(`Moments configuration error: ${message}`);
}

function validatePrefix(value: unknown, field: string, unavailableRoots: Set<string>): string {
  if (typeof value !== 'string' || value.length === 0) configError(`"${field}" must be a non-empty path.`);
  if (value !== value.trim()) configError(`"${field}" cannot contain surrounding whitespace.`);
  if (value.startsWith('/') || value.endsWith('/')) configError(`"${field}" cannot start or end with "/".`);
  if (value.includes('//')) configError(`"${field}" cannot contain an empty path segment.`);
  if (/[?#%\\[\]]/.test(value) || value.includes('://')) {
    configError(`"${field}" must be a plain path without a protocol, query, fragment, escape, or Astro parameter.`);
  }

  const segments = value.split('/');
  for (const segment of segments) {
    if (segment === '.' || segment === '..' || !SAFE_SEGMENT.test(segment)) {
      configError(`"${field}" contains unsafe segment "${segment}".`);
    }
  }

  if (unavailableRoots.has(segments[0].toLowerCase())) {
    configError(`"${field}" conflicts with reserved, locale, or featured-series root "${segments[0]}".`);
  }
  return segments.map((segment) => segment.toLowerCase()).join('/');
}

function validateChannelSlug(value: unknown, field: string, unavailableSlugs: Set<string>): string {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) {
    configError(`"${field}" must be one safe URL segment.`);
  }
  const normalized = value.toLowerCase();
  if (unavailableSlugs.has(normalized)) {
    configError(`"${field}" conflicts with reserved, locale, or featured-series slug "${value}".`);
  }
  if (!SAFE_SEGMENT.test(value)) configError(`"${field}" must be one safe URL segment.`);
  return normalized;
}

function normalizeOptionalText(value: unknown, field: string, fallback?: string): string | undefined {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.trim() === '') configError(`"${field}" must be a non-empty string.`);
  return value.trim();
}

function normalizeOgImage(value: unknown, field: string): string | undefined {
  const image = normalizeOptionalText(value, field);
  if (!image) return undefined;
  if (image.startsWith('/')) {
    if (image.startsWith('//') || image.includes('\\') || image.split('/').includes('..') || /[?#]/.test(image)) {
      configError(`"${field}" must be a safe public path or an absolute HTTPS URL.`);
    }
    return image;
  }

  let url: URL;
  try {
    url = new URL(image);
  } catch {
    configError(`"${field}" must be a safe public path or an absolute HTTPS URL.`);
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    configError(`"${field}" must be a safe public path or an absolute HTTPS URL.`);
  }
  return url.href;
}

export function normalizeMomentsConfig(
  raw: MomentsConfig | undefined,
  context: MomentsValidationContext = {},
): NormalizedMomentsConfig {
  if (raw !== undefined && (typeof raw !== 'object' || raw === null || Array.isArray(raw))) {
    configError('"moments" must be an object.');
  }
  if (raw?.enabled !== undefined && typeof raw.enabled !== 'boolean') configError('"enabled" must be a boolean.');

  const unavailableRoots = lowerSet([
    ...lowerSet(context.reservedRoutes),
    ...lowerSet(context.localeCodes),
    ...lowerSet(context.seriesSlugs),
  ]);
  const unavailableChannelSlugs = new Set([...unavailableRoots, ...INTERNAL_CHANNEL_SLUGS]);
  const path = validatePrefix(raw?.path ?? DEFAULT_PATH, 'path', unavailableRoots);
  if (raw?.pathAliases !== undefined && !Array.isArray(raw.pathAliases)) configError('"pathAliases" must be an array.');
  const pathAliases = (raw?.pathAliases ?? []).map((alias, index) =>
    validatePrefix(alias, `pathAliases[${index}]`, unavailableRoots),
  );
  const prefixOwners = new Map<string, string>([[path, 'path']]);
  for (const [index, alias] of pathAliases.entries()) {
    const conflict = Array.from(prefixOwners.entries()).find(
      ([prefix]) => alias === prefix || alias.startsWith(`${prefix}/`) || prefix.startsWith(`${alias}/`),
    );
    if (conflict) {
      configError(`"pathAliases[${index}]" overlaps ${conflict[1]} at "${alias}" and "${conflict[0]}".`);
    }
    prefixOwners.set(alias, `pathAliases[${index}]`);
  }

  if (raw?.channels !== undefined && !Array.isArray(raw.channels)) configError('"channels" must be an array.');
  const channelIds = new Set<string>();
  const channelSlugOwners = new Map<string, string>();
  let primaryCount = 0;
  const channels = (raw?.channels ?? []).map((channel, index): NormalizedMomentsChannelConfig => {
    if (typeof channel !== 'object' || channel === null || Array.isArray(channel)) {
      configError(`"channels[${index}]" must be an object.`);
    }
    if (typeof channel.id !== 'string' || !UUID.test(channel.id)) {
      configError(`"channels[${index}].id" must be a full suite UUID.`);
    }
    const id = channel.id.toLowerCase();
    if (channelIds.has(id)) configError(`Duplicate channel id "${channel.id}".`);
    channelIds.add(id);
    if (channel.primary !== undefined && typeof channel.primary !== 'boolean') {
      configError(`"channels[${index}].primary" must be a boolean.`);
    }
    if (channel.hidden !== undefined && typeof channel.hidden !== 'boolean') {
      configError(`"channels[${index}].hidden" must be a boolean.`);
    }
    if (channel.primary) primaryCount += 1;

    const slug =
      channel.slug === undefined
        ? undefined
        : validateChannelSlug(channel.slug, `channels[${index}].slug`, unavailableChannelSlugs);
    if (channel.aliases !== undefined && !Array.isArray(channel.aliases)) {
      configError(`"channels[${index}].aliases" must be an array.`);
    }
    const aliases = (channel.aliases ?? []).map((alias, aliasIndex) =>
      validateChannelSlug(alias, `channels[${index}].aliases[${aliasIndex}]`, unavailableChannelSlugs),
    );
    if (aliases.length > 0 && !slug) {
      configError(`"channels[${index}].slug" is required when channel aliases are configured.`);
    }
    for (const [kind, value] of [
      ...(slug ? ([['slug', slug]] as const) : []),
      ...aliases.map((alias, aliasIndex) => [`aliases[${aliasIndex}]`, alias] as const),
    ]) {
      const owner = channelSlugOwners.get(value);
      if (owner) configError(`"channels[${index}].${kind}" duplicates ${owner} at "${value}".`);
      channelSlugOwners.set(value, `channels[${index}].${kind}`);
    }

    return {
      id,
      slug,
      title: normalizeOptionalText(channel.title, `channels[${index}].title`),
      primary: channel.primary ?? false,
      hidden: channel.hidden ?? false,
      ogImage: normalizeOgImage(channel.ogImage, `channels[${index}].ogImage`),
      aliases,
    };
  });
  if (primaryCount > 1) configError('At most one channel may set "primary: true".');

  return {
    enabled: raw?.enabled ?? false,
    path,
    title: normalizeOptionalText(raw?.title, 'title', DEFAULT_TITLE) as string,
    description: normalizeOptionalText(raw?.description, 'description', DEFAULT_DESCRIPTION) as string,
    ogImage: normalizeOgImage(raw?.ogImage, 'ogImage'),
    pathAliases,
    channels,
    channelSlugBlocklist: [...unavailableChannelSlugs],
  };
}

function fallbackChannelSlug(channel: SuiteChannel, unavailableSlugs: Set<string>): string {
  const username = channel.username?.replace(/^@/, '').toLowerCase();
  return username && SAFE_SEGMENT.test(username) && !unavailableSlugs.has(username) ? username : channel.id.toLowerCase();
}

export function resolveMomentsChannels(
  config: NormalizedMomentsConfig,
  suiteChannels: readonly SuiteChannel[],
  context: MomentsValidationContext = {},
): ResolvedMomentsChannel[] {
  const unavailableSlugs = new Set([
    ...config.channelSlugBlocklist,
    ...lowerSet(context.reservedRoutes),
    ...lowerSet(context.localeCodes),
    ...lowerSet(context.seriesSlugs),
    ...INTERNAL_CHANNEL_SLUGS,
  ]);
  const suiteById = new Map(suiteChannels.map((channel) => [channel.id.toLowerCase(), channel]));
  const configuredIds = new Set(config.channels.map((channel) => channel.id));
  const ordered = [
    ...config.channels.flatMap((override) => {
      const channel = suiteById.get(override.id);
      return channel ? [{ channel, override }] : [];
    }),
    ...suiteChannels.flatMap((channel) =>
      configuredIds.has(channel.id.toLowerCase()) ? [] : [{ channel, override: undefined }],
    ),
  ];
  const slugOwners = new Map<string, string>();
  const resolved = ordered.map(({ channel, override }): ResolvedMomentsChannel => {
    const id = channel.id.toLowerCase();
    if (!UUID.test(id)) configError(`Suite channel "${channel.id}" does not have a valid UUID.`);
    const slug = override?.slug ?? fallbackChannelSlug(channel, unavailableSlugs);
    for (const candidate of [slug, ...(override?.aliases ?? [])]) {
      const owner = slugOwners.get(candidate);
      if (owner) configError(`Resolved channel URL "${candidate}" collides between "${owner}" and "${id}".`);
      slugOwners.set(candidate, id);
    }
    return {
      id,
      slug,
      title: override?.title ?? channel.title,
      username: channel.username?.replace(/^@/, '') || undefined,
      primary: override?.primary ?? false,
      hidden: override?.hidden ?? false,
      ogImage: override?.ogImage,
      aliases: override?.aliases ?? [],
    };
  });

  const explicitPrimary = resolved.find((channel) => channel.primary && !channel.hidden);
  const primary = explicitPrimary ?? resolved.find((channel) => !channel.hidden);
  return resolved.map((channel) => ({ ...channel, primary: channel.id === primary?.id }));
}

function replaceMomentsPlaceholders(items: readonly RouterItem[], config: NormalizedMomentsConfig): RouterItem[] {
  return items.flatMap((item): RouterItem[] => {
    if (item.feature === 'moments') {
      if (!config.enabled) return [];
      return [
        {
          name: config.title,
          path: `/${config.path}`,
          icon: item.icon ?? DEFAULT_ICON,
          localeIndependent: true,
        },
      ];
    }
    const children = item.children ? replaceMomentsPlaceholders(item.children, config) : undefined;
    if (!item.path && item.children && children?.length === 0) return [];
    return [{ ...item, children }];
  });
}

function insertAfterArchives(items: readonly RouterItem[], momentsItem: RouterItem): [RouterItem[], boolean] {
  const result: RouterItem[] = [];
  for (const [index, item] of items.entries()) {
    if (item.children) {
      const [children, inserted] = insertAfterArchives(item.children, momentsItem);
      result.push({ ...item, children });
      if (inserted) return [[...result, ...items.slice(index + 1)], true];
      continue;
    }
    result.push(item);
    if (item.path?.replace(/\/+$/, '').toLowerCase() === '/archives') {
      return [[...result, momentsItem, ...items.slice(index + 1)], true];
    }
  }
  return [result, false];
}

export function resolveMomentsNavigation(items: readonly RouterItem[], config: NormalizedMomentsConfig): RouterItem[] {
  const placeholderCount = (nodes: readonly RouterItem[]): number =>
    nodes.reduce((count, item) => count + (item.feature === 'moments' ? 1 : 0) + placeholderCount(item.children ?? []), 0);
  const count = placeholderCount(items);
  if (count > 1) configError('Navigation may contain at most one "feature: moments" placeholder.');

  const replaced = replaceMomentsPlaceholders(items, config);
  if (!config.enabled || count === 1) return replaced;
  const momentsItem: RouterItem = {
    name: config.title,
    path: `/${config.path}`,
    icon: DEFAULT_ICON,
    localeIndependent: true,
  };
  const [injected, inserted] = insertAfterArchives(replaced, momentsItem);
  return inserted ? injected : [...replaced, momentsItem];
}

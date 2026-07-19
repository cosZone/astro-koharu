/**
 * OG Data API Handler
 *
 * Fetches Open Graph metadata for URLs using metascraper.
 * Also manages the shared cache file at .cache/og-data.json
 */

import type { LookupAddress } from 'node:dns';
import { lookup } from 'node:dns/promises';
import fs from 'node:fs';
import { isIP, type LookupFunction } from 'node:net';
import path from 'node:path';
import type { Context } from 'hono';
import metascraper from 'metascraper';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperLogo from 'metascraper-logo';
import metascraperLogoFavicon from 'metascraper-logo-favicon';
import metascraperTitle from 'metascraper-title';
import metascraperUrl from 'metascraper-url';
import { Agent, fetch } from 'undici';

interface OGData {
  originUrl: string;
  url: string;
  title?: string;
  description?: string;
  image?: string | null;
  logo?: string | null;
  error?: string;
}

interface CacheEntry {
  data: OGData;
  timestamp: number;
}

interface CacheData {
  [url: string]: CacheEntry;
}

interface ValidatedPublicUrl {
  url: URL;
  addresses: LookupAddress[];
}

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const REQUEST_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 5;
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

const NON_PUBLIC_IPV4_RANGES: ReadonlyArray<readonly [network: number, prefixLength: number]> = [
  [0x00000000, 8], // Unspecified and current network
  [0x0a000000, 8], // Private network
  [0x64400000, 10], // Carrier-grade NAT
  [0x7f000000, 8], // Loopback
  [0xa9fe0000, 16], // Link-local
  [0xac100000, 12], // Private network
  [0xc0000000, 24], // IETF protocol assignments
  [0xc0000200, 24], // Documentation
  [0xc0586300, 24], // Deprecated 6to4 relay anycast
  [0xc0a80000, 16], // Private network
  [0xc6120000, 15], // Benchmarking
  [0xc6336400, 24], // Documentation
  [0xcb007100, 24], // Documentation
  [0xe0000000, 4], // Multicast
  [0xf0000000, 4], // Reserved and limited broadcast
];

interface FaviconResolution {
  url: string;
}

type SafeFaviconResolver = (
  faviconUrl: string,
  contentTypes?: string[],
  gotOptions?: unknown,
) => Promise<FaviconResolution | undefined>;

interface SafeFaviconOptions {
  favicon: boolean;
  google: boolean;
  rootFavicon: boolean;
  resolveFaviconUrl: SafeFaviconResolver;
}

// The package only reads `response.url`, but its declaration unnecessarily requires a full got Response.
// Keep the adapter narrow so the resolver can validate declared icons without performing a second request.
const createSafeFaviconRules = metascraperLogoFavicon as unknown as (
  options: SafeFaviconOptions,
) => ReturnType<typeof metascraperLogoFavicon>;

function parseIPv4(address: string): number | null {
  const parts = address.split('.');
  if (parts.length !== 4) return null;

  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = (value * 256 + octet) >>> 0;
  }
  return value;
}

function isIPv4InRange(address: number, network: number, prefixLength: number): boolean {
  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (address & mask) >>> 0 === (network & mask) >>> 0;
}

function isPublicIPv4Value(address: number): boolean {
  return !NON_PUBLIC_IPV4_RANGES.some(([network, prefixLength]) => isIPv4InRange(address, network, prefixLength));
}

function parseIPv6(address: string): bigint | null {
  if (address.includes('%')) return null;

  let normalized = address.toLowerCase();
  const embeddedIPv4Match = normalized.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  const embeddedIPv4 = embeddedIPv4Match?.[1];
  if (embeddedIPv4) {
    const ipv4 = parseIPv4(embeddedIPv4);
    if (ipv4 === null) return null;
    const ipv4Start = normalized.length - embeddedIPv4.length;
    normalized = `${normalized.slice(0, ipv4Start)}${(ipv4 >>> 16).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }

  const halves = normalized.split('::');
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const omittedGroups = 8 - left.length - right.length;
  if ((halves.length === 1 && omittedGroups !== 0) || (halves.length === 2 && omittedGroups < 1)) return null;

  const groups = [...left, ...Array.from({ length: omittedGroups }, () => '0'), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[\da-f]{1,4}$/.test(group))) return null;

  return groups.reduce((value, group) => (value << 16n) | BigInt(`0x${group}`), 0n);
}

function isIPv6InRange(address: bigint, network: bigint, prefixLength: number): boolean {
  const shift = BigInt(128 - prefixLength);
  return address >> shift === network >> shift;
}

function ipv6Network(address: string): bigint {
  const parsed = parseIPv6(address);
  if (parsed === null) throw new Error(`Invalid IPv6 network constant: ${address}`);
  return parsed;
}

const IPV6_GLOBAL_UNICAST = ipv6Network('2000::');
const IPV6_MAPPED_IPV4 = ipv6Network('::ffff:0:0');
const NON_PUBLIC_IPV6_RANGES: ReadonlyArray<readonly [network: bigint, prefixLength: number]> = [
  [ipv6Network('2001::'), 23], // IETF special-purpose addresses
  [ipv6Network('2001:db8::'), 32], // Documentation
  [ipv6Network('2002::'), 16], // Deprecated 6to4
  [ipv6Network('3fff::'), 20], // Documentation
];

function isPublicIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const parsed = parseIPv4(address);
    return parsed !== null && isPublicIPv4Value(parsed);
  }
  if (family !== 6) return false;

  const parsed = parseIPv6(address);
  if (parsed === null) return false;

  if (isIPv6InRange(parsed, IPV6_MAPPED_IPV4, 96)) {
    return isPublicIPv4Value(Number(parsed & 0xffffffffn));
  }

  if (!isIPv6InRange(parsed, IPV6_GLOBAL_UNICAST, 3)) return false;
  return !NON_PUBLIC_IPV6_RANGES.some(([network, prefixLength]) => isIPv6InRange(parsed, network, prefixLength));
}

async function validatePublicUrl(value: string | URL, signal: AbortSignal): Promise<ValidatedPublicUrl> {
  const parsed = value instanceof URL ? new URL(value.href) : new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Invalid URL protocol');
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  const literalFamily = isIP(hostname);
  signal.throwIfAborted();
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await lookup(hostname, { all: true, verbatim: true });
  signal.throwIfAborted();

  if (addresses.length === 0) throw new Error('URL hostname did not resolve');
  if (addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new Error('URL hostname resolves to a non-public IP address');
  }

  return { url: parsed, addresses };
}

function createSafeFaviconResolver(signal: AbortSignal): SafeFaviconResolver {
  return async (faviconUrl) => {
    try {
      const validated = await validatePublicUrl(faviconUrl, signal);
      return { url: validated.url.href };
    } catch {
      // A page-controlled favicon must not fail otherwise valid metadata extraction.
      if (signal.aborted) signal.throwIfAborted();
      return undefined;
    }
  };
}

function createScraper(signal: AbortSignal) {
  return metascraper([
    metascraperDescription(),
    metascraperImage(),
    metascraperLogo(),
    metascraperTitle(),
    metascraperUrl(),
    createSafeFaviconRules({
      favicon: false,
      google: false,
      rootFavicon: false,
      resolveFaviconUrl: createSafeFaviconResolver(signal),
    }),
  ]);
}

function createPinnedDispatcher(addresses: LookupAddress[]): Agent {
  if (addresses.length === 0) throw new Error('URL hostname did not resolve');
  const pinnedAddresses = addresses.map(({ address, family }) => ({ address, family }));

  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, pinnedAddresses);
      return;
    }

    const pinnedAddress =
      options.family === 4 || options.family === 6
        ? pinnedAddresses.find(({ family }) => family === options.family)
        : pinnedAddresses[0];
    if (!pinnedAddress) {
      const error = Object.assign(new Error('No validated address matches the requested IP family'), {
        code: 'ENOTFOUND',
      });
      callback(error, '', 0);
      return;
    }
    callback(null, pinnedAddress.address, pinnedAddress.family);
  };

  return new Agent({ connect: { lookup: pinnedLookup } });
}

/**
 * Get cache file path
 */
function getCachePath(projectRoot: string): string {
  return path.join(projectRoot, '.cache', 'og-data.json');
}

/**
 * Load cache from file
 */
function loadCache(projectRoot: string): CacheData {
  const cachePath = getCachePath(projectRoot);
  try {
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('[OG Data API] Failed to load cache:', error);
  }
  return {};
}

/**
 * Save cache to file
 */
function saveCache(projectRoot: string, cache: CacheData): void {
  const cacheDir = path.join(projectRoot, '.cache');
  const cachePath = getCachePath(projectRoot);

  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.warn('[OG Data API] Failed to save cache:', error);
  }
}

/**
 * Fetch OG data from URL
 */
async function fetchOGData(url: string): Promise<OGData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const dispatchers: Agent[] = [];

  try {
    let validatedUrl = await validatePublicUrl(url, controller.signal);
    let response: Awaited<ReturnType<typeof fetch>>;
    let redirectCount = 0;

    while (true) {
      const dispatcher = createPinnedDispatcher(validatedUrl.addresses);
      dispatchers.push(dispatcher);
      response = await fetch(validatedUrl.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        dispatcher,
        redirect: 'manual',
        signal: controller.signal,
      });

      if (!REDIRECT_STATUS_CODES.has(response.status)) break;

      const location = response.headers.get('location');
      if (!location) break;
      if (redirectCount >= MAX_REDIRECTS) {
        await response.body?.cancel();
        throw new Error('Too many redirects');
      }

      let redirectUrl: URL;
      try {
        redirectUrl = new URL(location, validatedUrl.url);
      } catch {
        await response.body?.cancel();
        throw new Error('Invalid redirect URL');
      }

      await response.body?.cancel();
      validatedUrl = await validatePublicUrl(redirectUrl, controller.signal);
      redirectCount += 1;
    }

    if (!response.ok) {
      return {
        originUrl: url,
        url,
        error: `Failed to fetch: ${response.status}`,
      };
    }

    const html = await response.text();
    const metadata = await createScraper(controller.signal)({ html, url });

    return {
      originUrl: url,
      url: metadata.url || url,
      title: metadata.title,
      description: metadata.description,
      image: metadata.image,
      logo: metadata.logo || metadata.favicon,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        originUrl: url,
        url,
        error: 'Request timeout',
      };
    }
    return {
      originUrl: url,
      url,
      error: error instanceof Error ? error.message : 'Failed to fetch',
    };
  } finally {
    clearTimeout(timeoutId);
    await Promise.allSettled(dispatchers.map((dispatcher) => dispatcher.close()));
  }
}

/**
 * GET /api/cms/og-data?url=<url>
 *
 * Fetches OG data for a URL, using cache when available.
 */
export async function ogDataHandler(c: Context) {
  const projectRoot = c.get('projectRoot') as string;
  const url = c.req.query('url');

  if (!url) {
    return c.json({ error: 'Missing url parameter' }, 400);
  }

  // Validate URL
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return c.json({ error: 'Invalid URL protocol' }, 400);
    }
  } catch {
    return c.json({ error: 'Invalid URL' }, 400);
  }

  // Check cache first
  const cache = loadCache(projectRoot);
  const entry = cache[url];

  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return c.json(entry.data);
  }

  // Fetch fresh data
  const data = await fetchOGData(url);

  // Save to cache
  cache[url] = {
    data,
    timestamp: Date.now(),
  };
  saveCache(projectRoot, cache);

  return c.json(data);
}

/**
 * GET /api/cms/og-cache
 *
 * Returns the entire OG data cache for client-side use.
 */
export async function ogCacheHandler(c: Context) {
  const projectRoot = c.get('projectRoot') as string;
  const cache = loadCache(projectRoot);
  return c.json(cache);
}

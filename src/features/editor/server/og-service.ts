import type { LookupAddress } from 'node:dns';
import type { LookupFunction } from 'node:net';
import metascraper from 'metascraper';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperLogo from 'metascraper-logo';
import metascraperLogoFavicon from 'metascraper-logo-favicon';
import metascraperTitle from 'metascraper-title';
import metascraperUrl from 'metascraper-url';
import { Agent, fetch } from 'undici';
import type { OGData } from '../../../lib/markdown/og-fetcher';
import {
  OGRequestError,
  parsePublicUrl,
  type ResolveAddresses,
  resolveAddresses,
  validatePublicUrl,
  withAbort,
} from './public-url';

interface FetchResponse {
  status: number;
  headers: { get(name: string): string | null };
  body: {
    getReader(): {
      read(): Promise<{ done: boolean; value?: Uint8Array }>;
      cancel(): Promise<void>;
    };
  } | null;
}

interface FetchResult {
  response: FetchResponse;
  dispose(): Promise<void>;
}

type RequestPage = (url: URL, addresses: LookupAddress[], signal: AbortSignal) => Promise<FetchResult>;
type Metadata = {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  logo?: string | null;
  url?: string | null;
};
type ExtractMetadata = (html: string, url: string, signal: AbortSignal) => Promise<Metadata>;

export interface OGServiceOptions {
  timeoutMs?: number;
  maxHtmlBytes?: number;
  maxConcurrent?: number;
  maxCacheEntries?: number;
  successTtlMs?: number;
  failureTtlMs?: number;
  /** Dependency injection keeps SSRF, deadlines and cache tests offline. */
  resolve?: ResolveAddresses;
  request?: RequestPage;
  extract?: ExtractMetadata;
  now?: () => number;
}

export const OG_SERVICE_DEFAULTS = {
  timeoutMs: 8000,
  maxHtmlBytes: 1024 * 1024,
  maxConcurrent: 4,
  maxCacheEntries: 256,
  successTtlMs: 60 * 60 * 1000,
  failureTtlMs: 30 * 1000,
} as const;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;

/** DNS is resolved and checked once per hop, then pinned into the actual connection. */
const requestPage: RequestPage = async (url, addresses, signal) => {
  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, addresses);
      return;
    }
    const address =
      options.family === 4 || options.family === 6 ? addresses.find(({ family }) => family === options.family) : addresses[0];
    if (!address) {
      callback(Object.assign(new Error('Address unavailable'), { code: 'ENOTFOUND' }), '', 0);
      return;
    }
    callback(null, address.address, address.family);
  };
  const dispatcher = new Agent({ connect: { lookup: pinnedLookup }, maxHeaderSize: 16 * 1024 });
  const abort = () => void dispatcher.destroy().catch(() => {});
  signal.addEventListener('abort', abort, { once: true });
  try {
    signal.throwIfAborted();
    const response = await fetch(url, {
      dispatcher,
      redirect: 'manual',
      signal,
      headers: {
        'User-Agent': 'Koharu-LinkPreview/1.0',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    return {
      response,
      async dispose() {
        signal.removeEventListener('abort', abort);
        await dispatcher.destroy();
      },
    };
  } catch (error) {
    signal.removeEventListener('abort', abort);
    await dispatcher.destroy();
    throw error;
  }
};

interface SafeFaviconOptions {
  favicon: boolean;
  google: boolean;
  rootFavicon: boolean;
  resolveFaviconUrl: (url: string) => Promise<{ url: string } | undefined>;
}
// metascraper only needs response.url here; its declared resolver response is unnecessarily broad.
const safeFaviconRules = metascraperLogoFavicon as unknown as (
  options: SafeFaviconOptions,
) => ReturnType<typeof metascraperLogoFavicon>;

function createExtractor(resolve: ResolveAddresses): ExtractMetadata {
  return async (html, url, signal) => {
    const scraper = metascraper([
      metascraperDescription(),
      metascraperImage(),
      metascraperLogo(),
      metascraperTitle(),
      metascraperUrl(),
      safeFaviconRules({
        favicon: false,
        google: false,
        rootFavicon: false,
        async resolveFaviconUrl(value) {
          try {
            const validated = await validatePublicUrl(value, signal, resolve);
            return { url: validated.url.href };
          } catch {
            return undefined;
          }
        },
      }),
    ]);
    return scraper({ html, url });
  };
}

async function readHtml(response: FetchResponse, limit: number, signal: AbortSignal): Promise<string> {
  const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (type !== 'text/html' && type !== 'application/xhtml+xml') throw new OGRequestError('此链接未返回网页');
  const length = Number(response.headers.get('content-length'));
  if (length > limit) throw new OGRequestError('网页过大，无法生成预览');
  if (!response.body) throw new OGRequestError('网页内容为空');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await withAbort(reader.read(), signal);
      if (done) break;
      if (!value) continue;
      bytes += value.byteLength;
      if (bytes > limit) throw new OGRequestError('网页过大，无法生成预览');
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join('');
  } finally {
    void reader.cancel().catch(() => {});
  }
}

export function createEditorOGService(options: OGServiceOptions = {}): (url: string) => Promise<OGData> {
  const config = { ...OG_SERVICE_DEFAULTS, ...options };
  const resolve = options.resolve ?? resolveAddresses;
  const request = options.request ?? requestPage;
  const extract = options.extract ?? createExtractor(resolve);
  const now = options.now ?? Date.now;
  const cache = new Map<string, { data: OGData; expiresAt: number }>();
  const inFlight = new Map<string, Promise<OGData>>();

  async function safeMetadataUrl(value: string | null | undefined, base: URL, signal: AbortSignal) {
    if (!value) return undefined;
    try {
      const result = await validatePublicUrl(new URL(value, base), signal, resolve);
      return result.url.href;
    } catch {
      signal.throwIfAborted();
      return undefined;
    }
  }

  async function fetchFresh(url: URL): Promise<OGData> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    const signal = controller.signal;
    const fetchPage = async (): Promise<OGData> => {
      let current = await validatePublicUrl(url, signal, resolve);
      for (let hop = 0; ; hop += 1) {
        signal.throwIfAborted();
        const result = await request(current.url, current.addresses, signal);
        try {
          const { response } = result;
          if (REDIRECTS.has(response.status)) {
            const location = response.headers.get('location');
            if (!location) throw new OGRequestError('网页重定向无效');
            if (hop >= MAX_REDIRECTS) throw new OGRequestError('网页重定向过多');
            current = await validatePublicUrl(new URL(location, current.url), signal, resolve);
            continue;
          }
          if (response.status < 200 || response.status >= 300) {
            throw new OGRequestError(`网站暂时无法访问（${response.status}）`);
          }
          const html = await readHtml(response, config.maxHtmlBytes, signal);
          const metadata = await withAbort(extract(html, current.url.href, signal), signal);
          const [canonical, image, logo] = await Promise.all([
            safeMetadataUrl(metadata.url, current.url, signal),
            safeMetadataUrl(metadata.image, current.url, signal),
            safeMetadataUrl(metadata.logo, current.url, signal),
          ]);
          return {
            originUrl: url.href,
            url: canonical ?? current.url.href,
            title: metadata.title?.slice(0, 300) || undefined,
            description: metadata.description?.slice(0, 1000) || undefined,
            image,
            logo,
          };
        } finally {
          await result.dispose();
        }
      }
    };
    try {
      return await withAbort(fetchPage(), signal);
    } catch (error) {
      return {
        originUrl: url.href,
        url: url.href,
        error: signal.aborted ? '链接预览请求超时' : error instanceof OGRequestError ? error.message : '暂时无法获取链接预览',
      };
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }

  return async (input) => {
    let url: URL;
    try {
      url = parsePublicUrl(input);
    } catch (error) {
      return { originUrl: '', url: '', error: error instanceof OGRequestError ? error.message : '链接格式无效' };
    }
    const key = url.href;
    const entry = cache.get(key);
    if (entry) {
      cache.delete(key);
      if (entry.expiresAt > now()) {
        cache.set(key, entry);
        return { ...entry.data };
      }
    }
    const pending = inFlight.get(key);
    if (pending) return { ...(await pending) };
    if (inFlight.size >= config.maxConcurrent) {
      return { originUrl: key, url: key, error: '链接预览服务繁忙，请稍后重试' };
    }
    const task = fetchFresh(url);
    inFlight.set(key, task);
    try {
      const data = await task;
      if (config.maxCacheEntries > 0) {
        while (cache.size >= config.maxCacheEntries) {
          const oldest = cache.keys().next().value;
          if (oldest === undefined) break;
          cache.delete(oldest);
        }
        cache.set(key, { data, expiresAt: now() + (data.error ? config.failureTtlMs : config.successTtlMs) });
      }
      return { ...data };
    } finally {
      inFlight.delete(key);
    }
  };
}

export const fetchEditorOG = createEditorOGService();

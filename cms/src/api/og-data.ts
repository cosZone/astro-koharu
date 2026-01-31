/**
 * OG Data API Handler
 *
 * Fetches Open Graph metadata for URLs using metascraper.
 * Also manages the shared cache file at .cache/og-data.json
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Context } from 'hono';
import metascraper from 'metascraper';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperLogo from 'metascraper-logo';
import metascraperLogoFavicon from 'metascraper-logo-favicon';
import metascraperTitle from 'metascraper-title';
import metascraperUrl from 'metascraper-url';

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

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Initialize metascraper with plugins
const scraper = metascraper([
  metascraperDescription(),
  metascraperImage(),
  metascraperLogo(),
  metascraperTitle(),
  metascraperUrl(),
  metascraperLogoFavicon(),
]);

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
  const TIMEOUT_MS = 5000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        originUrl: url,
        url,
        error: `Failed to fetch: ${response.status}`,
      };
    }

    const html = await response.text();
    const metadata = await scraper({ html, url });

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

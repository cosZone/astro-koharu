/**
 * OG Data Service
 *
 * Manages fetching and caching of Open Graph metadata for link previews.
 * Uses the shared cache file at .cache/og-data.json
 */

export interface OGData {
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

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// In-memory cache for client-side
let memoryCache: CacheData = {};

/**
 * Load cache from API (server reads .cache/og-data.json)
 */
export async function loadCache(): Promise<CacheData> {
  try {
    const response = await fetch('/api/cms/og-cache');
    if (response.ok) {
      memoryCache = await response.json();
      return memoryCache;
    }
  } catch (error) {
    console.warn('[OG Service] Failed to load cache:', error);
  }
  return memoryCache;
}

/**
 * Get cached OG data if valid
 */
export function getCachedOGData(url: string): OGData | null {
  const entry = memoryCache[url];

  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }

  return null;
}

/**
 * Update memory cache with new data
 */
export function updateMemoryCache(url: string, data: OGData): void {
  memoryCache[url] = {
    data,
    timestamp: Date.now(),
  };
}

/**
 * Fetch OG data from API
 */
export async function fetchOGData(url: string): Promise<OGData> {
  try {
    const response = await fetch(`/api/cms/og-data?url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    const data = (await response.json()) as OGData;

    // Update memory cache
    updateMemoryCache(url, data);

    return data;
  } catch (error) {
    console.warn('[OG Service] Failed to fetch OG data:', error);
    return {
      originUrl: url,
      url,
      error: error instanceof Error ? error.message : 'Failed to fetch',
    };
  }
}

/**
 * Get OG data with cache-first strategy
 */
export async function getOGData(url: string): Promise<OGData> {
  // Check memory cache first
  const cached = getCachedOGData(url);
  if (cached) {
    return cached;
  }

  // Fetch from API
  return fetchOGData(url);
}

/**
 * Batch load OG data for multiple URLs
 */
export async function batchLoadOGData(urls: string[]): Promise<Map<string, OGData>> {
  const results = new Map<string, OGData>();

  // First, check cache for all URLs
  const uncachedUrls: string[] = [];
  for (const url of urls) {
    const cached = getCachedOGData(url);
    if (cached) {
      results.set(url, cached);
    } else {
      uncachedUrls.push(url);
    }
  }

  // Fetch uncached URLs in parallel
  if (uncachedUrls.length > 0) {
    const fetchPromises = uncachedUrls.map(async (url) => {
      const data = await fetchOGData(url);
      return { url, data };
    });

    const fetchedResults = await Promise.all(fetchPromises);
    for (const { url, data } of fetchedResults) {
      results.set(url, data);
    }
  }

  return results;
}

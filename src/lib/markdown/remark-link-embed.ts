/**
 * Remark plugin to automatically embed standalone links as rich components
 * Detects Twitter/X links and other standalone links in paragraphs
 * Uses metascraper to fetch OG data at build time for link previews (SSG approach)
 * Implements file-based caching to speed up subsequent builds
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Link, Paragraph, Root } from 'mdast';
import metascraper from 'metascraper';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperLogo from 'metascraper-logo';
import metascraperLogoFavicon from 'metascraper-logo-favicon';
import metascraperTitle from 'metascraper-title';
import metascraperUrl from 'metascraper-url';
import sanitizeHtml from 'sanitize-html';
import type { Parent } from 'unist';
import { visit } from 'unist-util-visit';
import { classifyLink, isStandaloneLinkParagraph } from './link-utils';

// ============================================================================
// OG Data Cache Implementation
// ============================================================================

const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'og-data.json');
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface CacheEntry {
  data: OGData;
  timestamp: number;
}

interface CacheData {
  [url: string]: CacheEntry;
}

let memoryCache: CacheData | null = null;

/**
 * Load cache from file system
 */
function loadCache(): CacheData {
  if (memoryCache) return memoryCache;

  try {
    if (fs.existsSync(CACHE_FILE)) {
      const content = fs.readFileSync(CACHE_FILE, 'utf-8');
      memoryCache = JSON.parse(content);
      return memoryCache ?? {};
    }
  } catch (error) {
    console.warn('[Link Embed] Failed to load cache:', error);
  }

  memoryCache = {};
  return memoryCache;
}

/**
 * Save cache to file system
 */
function saveCache(cache: CacheData): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    memoryCache = cache;
  } catch (error) {
    console.warn('[Link Embed] Failed to save cache:', error);
  }
}

/**
 * Get cached OG data if valid
 */
function getCachedOGData(url: string): OGData | null {
  const cache = loadCache();
  const entry = cache[url];

  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }

  return null;
}

/**
 * Set OG data in cache
 */
function setCachedOGData(url: string, data: OGData): void {
  const cache = loadCache();
  cache[url] = {
    data,
    timestamp: Date.now(),
  };
  saveCache(cache);
}

interface OGData {
  originUrl: string;
  url: string;
  title?: string;
  description?: string;
  image?: string;
  logo?: string;
  error?: string;
  author?: string;
}

interface RemarkLinkEmbedOptions {
  enableTweetEmbed?: boolean;
  enableCodePenEmbed?: boolean;
  enableOGPreview?: boolean;
}

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
 * Sanitize text content by removing all HTML tags
 * Uses sanitize-html to ensure security
 */
function sanitizeText(text: string): string {
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

/**
 * Sanitize URL to prevent XSS attacks
 * Only allows http/https protocols
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    // Sanitize the URL string
    return sanitizeHtml(url, {
      allowedTags: [],
      allowedAttributes: {},
    });
  } catch {
    return '';
  }
}

/**
 * Fetch OG data from a URL at build time using metascraper
 * With timeout to avoid hanging builds
 */
async function fetchOGData(url: string): Promise<OGData> {
  const TIMEOUT_MS = 5000; // 5 second timeout (most sites respond within 1-2s)

  try {
    // Create AbortController for timeout
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
      console.warn(`[Link Embed] Failed to fetch ${url}: ${response.status}`);
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
      logo: metadata?.logo || metadata?.favicon,
      author: metadata?.author || metadata?.publisher,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Link Embed] Timeout fetching ${url}`);
      return {
        originUrl: url,
        url,
        error: 'Request timeout',
      };
    }
    console.warn(`[Link Embed] Error fetching ${url}:`, error);
    return {
      originUrl: url,
      url,
      error: error instanceof Error ? error.message : 'Failed to fetch',
    };
  }
}

/**
 * Get domain from URL for display
 */
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    console.warn('[Link Embed] Failed to parse domain from URL:', url, error);
    return url;
  }
}

/**
 * Generate HTML for link preview card
 */
function generateLinkPreviewHTML(ogData: OGData): string {
  const { originUrl, url, title, description, image, logo, error } = ogData;
  const domain = getDomain(url);

  // If there's an error or no data, show an enhanced fallback link card
  if (error || !title) {
    // Try to extract a readable name from the URL path
    let displayText = domain;
    let subtitle = '';

    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter((s) => s);

      // Special handling for known sites
      if (domain === 'codepen.io' && pathSegments.length >= 3) {
        // CodePen: /username/pen/id
        const username = pathSegments[0];
        const penId = pathSegments[2];
        displayText = `CodePen - ${username}`;
        subtitle = `Pen: ${penId}`;
      } else if (domain === 'github.com' && pathSegments.length >= 2) {
        // GitHub: /org/repo
        displayText = `GitHub - ${pathSegments.slice(0, 2).join('/')}`;
      } else if (pathSegments.length > 0) {
        // Generic: use last meaningful segment
        const lastSegment = pathSegments[pathSegments.length - 1];
        if (lastSegment && lastSegment !== 'index.html') {
          displayText = originUrl;
          subtitle = description ?? domain;
        }
      }
    } catch (error) {
      console.warn('[Link Embed] Failed to extract readable text from URL:', url, error);
    }

    // Sanitize all user-generated content
    // Use originUrl to preserve the original URL path (metascraper may incorrectly normalize og:url)
    const safeUrl = sanitizeUrl(originUrl);
    const safeDisplayText = sanitizeText(displayText);
    const safeSubtitle = subtitle
      ? sanitizeText(subtitle)
      : sanitizeText(originUrl.length > 60 ? `${originUrl.substring(0, 60)}...` : originUrl);

    return `<div class="link-preview-block not-prose" data-state="error">
  <a href="${safeUrl}" target="_blank" class="hover:border-primary/50 group block rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md" aria-label="${safeDisplayText}">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-dasharray="28" stroke-dashoffset="28" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 6l2 -2c1 -1 3 -1 4 0l1 1c1 1 1 3 0 4l-5 5c-1 1 -3 1 -4 0M11 18l-2 2c-1 1 -3 1 -4 0l-1 -1c-1 -1 -1 -3 0 -4l5 -5c1 -1 3 -1 4 0"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="28;0"/></path></svg>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-foreground font-medium truncate">${safeDisplayText}</div>
          <div class="text-muted-foreground text-xs truncate mt-0.5">${safeSubtitle}</div>
        </div>
      </div>
      <svg class="text-primary h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
      </svg>
    </div>
  </a>
</div>`;
  }

  // Sanitize all content using sanitize-html
  // Use originUrl to preserve the original URL path (metascraper may incorrectly normalize og:url)
  const safeUrl = sanitizeUrl(originUrl);
  const safeTitle = sanitizeText(title);
  const safeDescription = description ? sanitizeText(description) : '';
  const safeDomain = sanitizeText(domain);
  const safeLogo = logo ? sanitizeUrl(logo) : '';
  const safeImage = image ? sanitizeUrl(image) : '';
  // console.log('ogData:%o', ogData);
  return `<div class="link-preview-block not-prose" data-state="success">
  <a href="${safeUrl}" target="_blank" class="group block overflow-hidden rounded-lg border border-border transition-all hover:border-primary/50 hover:shadow-md" aria-label="${safeTitle} - ${safeDomain}">
    <div class="bg-card flex md:flex-col flex-row">
      <div class="flex-1 p-4">
        <div class="mb-2 flex items-center gap-2">
          ${safeLogo ? `<img src="${safeLogo}" alt="" class="h-4 w-4 shrink-0" loading="lazy" aria-hidden="true" />` : ''}
          <span class="text-muted-foreground truncate text-xs font-medium">${safeDomain}</span>
        </div>
        <h3 class="text-foreground mb-2 line-clamp-2 font-semibold leading-tight">${safeTitle}</h3>
        ${safeDescription ? `<p class="text-muted-foreground mb-3 line-clamp-2 text-sm">${safeDescription}</p>` : ''}
        <div class="text-primary flex items-center gap-1 text-xs">
          <span class="truncate">${originUrl}</span>
          <svg class="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" viewBox="0 0 12 12"><path fill="currentColor" d="M4 3.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-.25a.75.75 0 0 1 1.5 0V8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h.25a.75.75 0 0 1 0 1.5zm2.75 0a.75.75 0 0 1 0-1.5h2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-.69L7.28 5.78a.75.75 0 0 1-1.06-1.06L7.44 3.5z"/></svg> 
        </div>
      </div>
      ${safeImage ? `<div class="bg-muted relative md:w-full shrink-0 aspect-1200/630 h-38"><img src="${safeImage}" alt="${safeTitle}" class="h-full w-full object-cover" loading="lazy" /></div>` : ''}
    </div>
  </a>
</div>`;
}

/**
 * Generate HTML for CodePen embed using official embed format
 * https://blog.codepen.io/documentation/embedded-pens/
 */
function generateCodePenEmbedHTML(user: string, penId: string, url: string): string {
  // Sanitize inputs
  const safeUser = sanitizeText(user);
  const safePenId = sanitizeText(penId);
  const safeUrl = sanitizeUrl(url);

  return `<p class="codepen" data-height="400" data-default-tab="result" data-slug-hash="${safePenId}" data-user="${safeUser}">
  <span>See the Pen <a href="${safeUrl}">${safePenId}</a> by ${safeUser} (<a href="https://codepen.io/${safeUser}">@${safeUser}</a>) on <a href="https://codepen.io">CodePen</a>.</span>
</p>`;
}

/**
 * Remark plugin that transforms standalone links into embed components
 * This version uses metascraper to fetch OG data at build time
 */
export function remarkLinkEmbed(options: RemarkLinkEmbedOptions = {}) {
  const { enableTweetEmbed = true, enableCodePenEmbed = true, enableOGPreview = true } = options;

  return async (tree: Root) => {
    const nodesToReplace: Array<{
      node: Paragraph;
      index: number;
      parent: Parent;
      url: string;
      type: string;
      tweetId?: string;
      codepen?: {
        user: string;
        penId: string;
      };
    }> = [];

    // First pass: identify standalone link paragraphs
    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      if (index === undefined || !parent) return;

      if (isStandaloneLinkParagraph(node)) {
        const linkNode = node.children[0] as Link;
        const url = linkNode.url;
        const linkInfo = classifyLink(url);

        nodesToReplace.push({
          node,
          index,
          parent,
          url,
          type: linkInfo.type,
          tweetId: linkInfo.tweetId,
          codepen: linkInfo.codepen,
        });
      }
    });

    // Second pass: fetch OG data in parallel for better performance
    const fetchPromises = nodesToReplace.map(async ({ url, type, tweetId, codepen }) => {
      if (type === 'tweet' && enableTweetEmbed && tweetId) {
        return {
          type: 'html' as const,
          value: `<div data-tweet-embed data-tweet-id="${tweetId}"></div>`,
        };
      } else if (type === 'codepen' && enableCodePenEmbed && codepen) {
        console.log(`[Link Embed] Embedding CodePen: ${codepen.user}/${codepen.penId}`);
        const html = generateCodePenEmbedHTML(codepen.user, codepen.penId, url);
        return {
          type: 'html' as const,
          value: html,
        };
      } else if (type === 'general' && enableOGPreview) {
        // Check cache first
        const cachedData = getCachedOGData(url);
        if (cachedData) {
          console.log(`[Link Embed] Using cached OG data for: ${url}`);
          const html = generateLinkPreviewHTML(cachedData);
          return {
            type: 'html' as const,
            value: html,
          };
        }

        // Fetch and cache
        console.log(`[Link Embed] Fetching OG data for: ${url}`);
        const ogData = await fetchOGData(url);
        setCachedOGData(url, ogData);
        const html = generateLinkPreviewHTML(ogData);
        return {
          type: 'html' as const,
          value: html,
        };
      }
      return null;
    });

    // Wait for all fetches to complete in parallel
    const embedNodes = await Promise.all(fetchPromises);

    // Replace nodes with their embed counterparts
    nodesToReplace.forEach(({ index, parent }, i) => {
      const embedNode = embedNodes[i];
      if (embedNode) {
        parent.children[index] = embedNode;
      }
    });
  };
}

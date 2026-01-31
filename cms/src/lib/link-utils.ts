/**
 * Link detection and classification utilities for markdown processing
 * Copied from src/lib/markdown/link-utils.ts for CMS use
 */

export interface LinkInfo {
  url: string;
  type: 'tweet' | 'codepen' | 'general';
  tweetId?: string;
  codepen?: {
    user: string;
    penId: string;
  };
}

/**
 * Extract Tweet ID from Twitter/X URL
 * Supports formats:
 * - https://twitter.com/username/status/1234567890
 * - https://x.com/username/status/1234567890
 * - https://twitter.com/i/web/status/1234567890
 * - With query parameters
 */
export function extractTweetId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check if it's a Twitter/X domain
    if (!['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'].includes(hostname)) {
      return null;
    }

    // Match status ID from path
    const match = urlObj.pathname.match(/\/status\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if URL is a Twitter/X link
 */
export function isTweetUrl(url: string): boolean {
  return extractTweetId(url) !== null;
}

/**
 * Extract CodePen user and pen ID from CodePen URL
 * Supports formats:
 * - https://codepen.io/username/pen/PenId
 * - https://codepen.io/username/pen/PenId/
 * - https://codepen.io/username/details/PenId
 * - With query parameters or hash
 */
export function extractCodePenId(url: string): { user: string; penId: string } | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check if it's a CodePen domain
    if (!['codepen.io', 'www.codepen.io'].includes(hostname)) {
      return null;
    }

    // Match username and pen ID from path
    // Format: /username/(pen|details)/penId
    const match = urlObj.pathname.match(/^\/([^/]+)\/(?:pen|details)\/([^/]+)/);
    if (match?.[1] && match[2]) {
      return {
        user: match[1],
        penId: match[2],
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if URL is a CodePen link
 */
export function isCodePenUrl(url: string): boolean {
  return extractCodePenId(url) !== null;
}

/**
 * Classify a link and extract relevant information
 */
export function classifyLink(url: string): LinkInfo {
  const tweetId = extractTweetId(url);

  if (tweetId) {
    return {
      url,
      type: 'tweet',
      tweetId,
    };
  }

  const codepen = extractCodePenId(url);

  if (codepen) {
    return {
      url,
      type: 'codepen',
      codepen,
    };
  }

  return {
    url,
    type: 'general',
  };
}

/**
 * Get domain from URL for display
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Pure HTML renderers for embedded links (OG preview card, CodePen, tweet).
 * Output is consumed verbatim by built pages, so markup must stay byte-stable.
 */

import sanitizeHtml from 'sanitize-html';
import type { OGData } from './og-fetcher';

/** Strip every HTML tag from user-generated text. */
function sanitizeText(text: string): string {
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

/** Escape text for interpolation into a quoted HTML attribute. */
function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeAttribute(value: string): string {
  return sanitizeText(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Drop anything that is not an http(s) URL, defeating `javascript:` style payloads. */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
}

function sanitizeUrlAttribute(url: string): string {
  return escapeHtmlAttribute(sanitizeUrl(url));
}

function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    console.warn('[Link Embed] Failed to parse domain from URL:', url, error);
    return url;
  }
}

/** Fallback card used when the fetch failed or the page exposed no title. */
function renderFallbackCard(ogData: OGData, domain: string): string {
  const { originUrl, url, description } = ogData;
  let displayText = domain;
  let subtitle = '';

  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter((s) => s);

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
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment && lastSegment !== 'index.html') {
        displayText = originUrl;
        subtitle = description ?? domain;
      }
    }
  } catch (error) {
    console.warn('[Link Embed] Failed to extract readable text from URL:', url, error);
  }

  // originUrl preserves the original path (metascraper may normalize og:url incorrectly)
  const safeUrl = sanitizeUrlAttribute(originUrl);
  const safeDisplayText = sanitizeText(displayText);
  const safeDisplayLabel = sanitizeAttribute(displayText);
  const safeSubtitle = subtitle
    ? sanitizeText(subtitle)
    : sanitizeText(originUrl.length > 60 ? `${originUrl.substring(0, 60)}...` : originUrl);

  return `<div class="link-preview-block not-prose" data-state="error">
  <a href="${safeUrl}" target="_blank" class="hover:border-primary/50 group block rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md" aria-label="${safeDisplayLabel}">
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

/** OG link preview card; falls back to a compact card when metadata is missing. */
export function renderLinkPreview(ogData: OGData): string {
  const { originUrl, url, title, description, image, logo, error } = ogData;
  const domain = getDomain(url);

  if (error || !title) {
    return renderFallbackCard(ogData, domain);
  }

  // originUrl preserves the original path (metascraper may normalize og:url incorrectly)
  const safeUrl = sanitizeUrlAttribute(originUrl);
  const safeTitle = sanitizeText(title);
  const safeDescription = description ? sanitizeText(description) : '';
  const safeDomain = sanitizeText(domain);
  const safeAriaLabel = sanitizeAttribute(`${title} - ${domain}`);
  const safeTitleAttribute = sanitizeAttribute(title);
  const safeLogo = logo ? sanitizeUrlAttribute(logo) : '';
  const safeImage = image ? sanitizeUrlAttribute(image) : '';
  const safeOriginUrl = sanitizeText(originUrl);
  return `<div class="link-preview-block not-prose" data-state="success">
  <a href="${safeUrl}" target="_blank" class="group block overflow-hidden rounded-lg border border-border transition-all hover:border-primary/50 hover:shadow-md" aria-label="${safeAriaLabel}">
    <div class="bg-card flex md:flex-col flex-row">
      <div class="flex-1 p-4">
        <div class="mb-2 flex items-center gap-2">
          ${safeLogo ? `<img src="${safeLogo}" alt="" class="h-4 w-4 shrink-0" loading="lazy" aria-hidden="true" referrerpolicy="no-referrer" />` : ''}
          <span class="text-muted-foreground truncate text-xs font-medium">${safeDomain}</span>
        </div>
        <h3 class="text-foreground mb-2 line-clamp-2 font-semibold leading-tight">${safeTitle}</h3>
        ${safeDescription ? `<p class="text-muted-foreground mb-3 line-clamp-2 text-sm">${safeDescription}</p>` : ''}
        <div class="text-primary flex items-center gap-1 text-xs">
          <span class="truncate">${safeOriginUrl}</span>
          <svg class="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" viewBox="0 0 12 12"><path fill="currentColor" d="M4 3.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-.25a.75.75 0 0 1 1.5 0V8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h.25a.75.75 0 0 1 0 1.5zm2.75 0a.75.75 0 0 1 0-1.5h2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-.69L7.28 5.78a.75.75 0 0 1-1.06-1.06L7.44 3.5z"/></svg> 
        </div>
      </div>
      ${safeImage ? `<div class="bg-muted relative md:w-full shrink-0 aspect-1200/630 md:aspect-auto md:max-h-48 w-80"><img src="${safeImage}" alt="${safeTitleAttribute}" class="link-preview-image h-full md:h-full w-full object-cover" loading="lazy" referrerpolicy="no-referrer" data-fallback-title="${safeTitleAttribute}" /></div>` : ''}
    </div>
  </a>
</div>`;
}

/**
 * CodePen embed markup in the official format.
 * https://blog.codepen.io/documentation/embedded-pens/
 */
export function renderCodePenEmbed(user: string, penId: string, url: string): string {
  const safeUser = sanitizeText(user);
  const safeUserAttribute = sanitizeAttribute(user);
  const safePenId = sanitizeText(penId);
  const safePenIdAttribute = sanitizeAttribute(penId);
  const safeUrl = sanitizeUrlAttribute(url);
  const safeAuthorUrl = sanitizeUrlAttribute(`https://codepen.io/${user}`);

  return `<p class="codepen" data-height="400" data-default-tab="result" data-slug-hash="${safePenIdAttribute}" data-user="${safeUserAttribute}">
  <span>See the Pen <a href="${safeUrl}">${safePenId}</a> by ${safeUser} (<a href="${safeAuthorUrl}">@${safeUser}</a>) on <a href="https://codepen.io">CodePen</a>.</span>
</p>`;
}

/** Placeholder hydrated client-side by the tweet embed component. */
export function renderTweetEmbed(tweetId: string, url: string): string {
  const safeUrl = sanitizeUrlAttribute(url);
  const safeTweetId = sanitizeAttribute(tweetId);
  return `<div data-tweet-embed data-tweet-id="${safeTweetId}" data-url="${safeUrl}"></div>`;
}

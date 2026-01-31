/**
 * Marked Extension for Link Embeds
 *
 * Transforms standalone links into embed placeholders that are later hydrated by React components.
 * Detects Twitter/X, CodePen, and general links.
 */

import type { MarkedExtension, Tokens } from 'marked';
import { classifyLink, extractCodePenId, extractTweetId } from './link-utils';

/**
 * Check if a paragraph token contains only a standalone link
 * Uses the token structure for reliable detection
 */
function isStandaloneLinkToken(token: Tokens.Paragraph): { isStandalone: boolean; url: string } {
  // Check if paragraph has exactly one token and it's a link
  if (token.tokens?.length === 1 && token.tokens[0].type === 'link') {
    const linkToken = token.tokens[0] as Tokens.Link;
    const linkText = linkToken.text;
    const linkHref = linkToken.href;

    // Check if link text matches the URL (standalone link)
    if (linkText === linkHref || linkHref.endsWith(linkText) || linkText.endsWith(linkHref)) {
      return { isStandalone: true, url: linkHref };
    }
  }

  return { isStandalone: false, url: '' };
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Create marked extension for link embeds
 */
export function createLinkEmbedExtension(): MarkedExtension {
  return {
    renderer: {
      paragraph(token: Tokens.Paragraph): string | false {
        const { isStandalone, url } = isStandaloneLinkToken(token);

        if (!isStandalone) {
          return false; // Use default paragraph renderer
        }

        const linkInfo = classifyLink(url);

        switch (linkInfo.type) {
          case 'tweet': {
            const tweetId = extractTweetId(url);
            if (tweetId) {
              return `<div data-tweet-embed data-tweet-id="${escapeHtml(tweetId)}" data-url="${escapeHtml(url)}"></div>`;
            }
            break;
          }
          case 'codepen': {
            const codepen = extractCodePenId(url);
            if (codepen) {
              return `<div data-codepen-embed data-user="${escapeHtml(codepen.user)}" data-pen-id="${escapeHtml(codepen.penId)}" data-url="${escapeHtml(url)}"></div>`;
            }
            break;
          }
          case 'general': {
            return `<div data-link-preview data-url="${escapeHtml(url)}"></div>`;
          }
        }

        return false; // Fallback to default renderer
      },
    },
  };
}

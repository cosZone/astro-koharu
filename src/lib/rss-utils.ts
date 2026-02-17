/**
 * Shared RSS feed utilities.
 *
 * Extracted from rss.xml.ts and [lang]/rss.xml.ts to avoid logic duplication.
 */
import { getSanitizeHtml } from '@lib/sanitize';
import sanitizeHtml from 'sanitize-html';
import { t } from '@/i18n';
import type { BlogPost } from '@/types/blog';

/** Generate a plain-text summary from rendered HTML */
function generateTextSummary(html?: string, length: number = 150): string {
  const text = sanitizeHtml(html ?? '', {
    allowedTags: [],
    allowedAttributes: {},
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional - filtering invalid XML characters
    textFilter: (text) => text.replace(/[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm, ''),
  });
  if (text.length <= length) return text;
  return text.substring(0, length).replace(/\s+\S*$/, '');
}

/** Build RSS item fields, handling encrypted posts */
export function buildRssItemFields(post: BlogPost, locale: string): { title: string; description: string; content: string } {
  if (post.data.password) {
    const rssNotice = t(locale, 'encrypted.post.rssNotice');
    return {
      title: `🔒 ${post.data.title}`,
      description: rssNotice,
      content: `<p>${rssNotice}</p>`,
    };
  }

  return {
    title: post.data.title,
    description: post.data?.description ?? generateTextSummary(post.rendered?.html),
    content: getSanitizeHtml(post.rendered?.html ?? ''),
  };
}

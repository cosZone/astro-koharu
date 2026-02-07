/**
 * HTML renderers for Shoka preprocessor output.
 *
 * Generates HTML strings for friend links, audio players, and video embeds.
 * Separated from the preprocessor to keep parsing and rendering concerns distinct.
 */

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Validate and sanitize a CSS color value (hex, named, hsl, rgb only) */
export function sanitizeCssColor(color: string): string | null {
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (/^(rgb|hsl)a?\([\d\s,%./]+\)$/.test(trimmed)) return trimmed;
  if (/^[a-zA-Z]+$/.test(trimmed)) return trimmed;
  return null;
}

export interface FriendLinkData {
  site: string;
  url: string;
  owner?: string;
  desc?: string;
  image?: string;
  color?: string;
}

export interface MediaItem {
  name?: string;
  url?: string;
  title?: string;
  list?: string[];
}

interface AudioGroup {
  title?: string;
  list: string[];
}

export function renderFriendLinks(items: FriendLinkData[]): string {
  const jsonData = escapeHtml(JSON.stringify(items));
  const cards = items
    .map((item) => {
      const safeColor = item.color ? sanitizeCssColor(item.color) : null;
      const colorStyle = safeColor ? ` style="border-color: ${escapeHtml(safeColor)}"` : '';
      const image = item.image
        ? `<img class="avatar" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.site)}" loading="lazy" />`
        : '';
      const desc = item.desc ? `<div class="desc">${escapeHtml(item.desc)}</div>` : '';
      return `<a class="friend-link-card" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"${colorStyle}>${image}<div class="info"><div class="name">${escapeHtml(item.site)}</div>${desc}</div></a>`;
    })
    .join('\n');
  return `<div class="friend-links-grid" data-links="${jsonData}">\n${cards}\n</div>`;
}

export function renderAudioMedia(items: MediaItem[]): string {
  const groups: AudioGroup[] = [];

  for (const item of items) {
    if (item.list && Array.isArray(item.list)) {
      groups.push({ title: item.title, list: item.list });
    } else if (item.url) {
      groups.push({ list: [item.url] });
    }
  }

  if (groups.length === 0) return '';

  const dataSrc = escapeHtml(JSON.stringify(groups));
  return `<div data-audio-player data-src="${dataSrc}"></div>`;
}

export function renderVideoMedia(items: MediaItem[]): string {
  const tracks = items
    .filter((item): item is MediaItem & { url: string } => !!item.url)
    .map((item) => ({ name: item.name || '', url: item.url }));

  if (tracks.length === 0) return '';
  const dataSrc = escapeHtml(JSON.stringify(tracks));
  return `<div data-video-player data-src="${dataSrc}"></div>`;
}

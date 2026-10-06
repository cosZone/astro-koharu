import type { DraftSummary } from './storage';

export const MAX_MARKDOWN_BYTES = 5 * 1024 * 1024;
export const IMPORT_PARAM = 'from';

/** Accept only a same-origin path to a `.md` file; anything else (absolute URLs, `//host`, schemes) is rejected. */
export function parseImportSource(value: string | null, origin: string): string | null {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\p{Cc}]/u.test(value)) return null;
  if (!URL.canParse(value, origin)) return null;
  const url = new URL(value, origin);
  if (url.origin !== origin || !url.pathname.endsWith('.md')) return null;
  return url.pathname;
}

/** The URL without the import parameter, so a reload does not import again. */
export function withoutImportParam(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(IMPORT_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Most recently edited draft imported from `path`. */
export function findImportedDraft(drafts: readonly DraftSummary[], path: string): DraftSummary | null {
  return drafts.reduce<DraftSummary | null>(
    (found, draft) => (draft.importedFrom === path && (!found || draft.updated > found.updated) ? draft : found),
    null,
  );
}

export function importFilename(path: string): string {
  const name = path.split('/').at(-1) ?? '';
  try {
    return decodeURIComponent(name) || 'post.md';
  } catch {
    return name || 'post.md';
  }
}

/** Fetch a post's raw Markdown, mapping failures to messages the writing room can show as-is. */
export async function fetchMarkdownSource(path: string, request: typeof fetch = fetch): Promise<string> {
  let response: Response;
  try {
    response = await request(path, { headers: { Accept: 'text/markdown, text/plain' }, credentials: 'same-origin' });
  } catch {
    throw new Error('无法连接博客，原文未导入。请检查网络后重试。');
  }
  if (response.status === 404) throw new Error('找不到这篇文章的原文，它可能已改名、加密或未公开。');
  if (!response.ok) throw new Error(`博客暂时无法提供原文（${response.status}），请稍后重试。`);
  if (response.headers.get('content-type')?.includes('text/html')) throw new Error('该地址返回的不是 Markdown 原文。');
  if (Number(response.headers.get('content-length')) > MAX_MARKDOWN_BYTES) throw new Error('原文超过 5 MB，无法导入。');
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_MARKDOWN_BYTES) throw new Error('原文超过 5 MB，无法导入。');
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer);
  } catch {
    throw new Error('原文不是有效的 UTF-8 文本，无法导入。');
  }
}

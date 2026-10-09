/** Keep the CDN's cover artwork while requesting the size used by the vinyl preview. */
export function sizedMusicCover(source: string): string {
  try {
    const url = new URL(source);
    if (/^p\d+\.music\.126\.net$/.test(url.hostname)) {
      url.searchParams.set('param', '200y200');
      return url.href;
    }
  } catch {
    // Local paths and custom cover schemes retain their original behavior.
  }
  return source;
}

/** Meting redirects hide the CDN URL; a header-only request avoids downloading the original. */
export async function resolveMusicCover(source: string, signal: AbortSignal): Promise<string> {
  const sized = sizedMusicCover(source);
  if (sized !== source) return sized;
  try {
    const url = new URL(source);
    if (url.searchParams.get('type') !== 'pic' || url.searchParams.get('server') !== 'netease') return source;
    const response = await fetch(url, { method: 'HEAD', signal });
    return response.ok ? sizedMusicCover(response.url) : source;
  } catch {
    return source;
  }
}

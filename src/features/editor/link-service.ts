const key = 'koharu-editor:og-endpoint:v1';

/** A bare instance origin uses the shared service's standard route. */
export function normalizeOGEndpoint(input: string, pageUrl: string): string {
  const value = input.trim();
  if (!/^https?:\/\//i.test(value) || value.length > 2048) throw new Error('请填写完整的 HTTP 或 HTTPS 实例地址。');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('实例地址无效，请检查域名和端口。');
  }
  if (url.username || url.password || url.search || url.hash) throw new Error('实例地址不能包含登录凭据、查询参数或锚点。');
  if (new URL(pageUrl).protocol === 'https:' && url.protocol !== 'https:')
    throw new Error('当前页面使用 HTTPS，实例也需要使用 HTTPS。');
  if (url.pathname === '/') url.pathname = '/api/editor/og';
  return url.href;
}

export function readOGEndpoint(storage: Pick<Storage, 'getItem'>, pageUrl: string): string | null {
  try {
    const value = storage.getItem(key);
    return value ? normalizeOGEndpoint(value, pageUrl) : null;
  } catch {
    return null;
  }
}

export function saveOGEndpoint(storage: Pick<Storage, 'setItem' | 'removeItem'>, endpoint: string | null): void {
  if (endpoint) storage.setItem(key, endpoint);
  else storage.removeItem(key);
}

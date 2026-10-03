import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { renderLinkPreview } from '../../../lib/markdown/link-card-template';
import type { OGData } from '../../../lib/markdown/og-fetcher';
import { fetchEditorOG } from './og-service';
import { MAX_URL_LENGTH, parsePublicUrl } from './public-url';

export interface EditorOGHandlerOptions {
  fetchOG?: (url: string) => Promise<OGData>;
  now?: () => number;
  requestsPerMinute?: number;
  maxClients?: number;
  allowedOrigins?: '*' | readonly string[];
}

function parseOrigin(value: string): URL | null {
  try {
    const origin = new URL(value);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== value) return null;
    return origin;
  } catch {
    return null;
  }
}

/** Undefined or an empty environment value keeps same-origin access only. */
export function parseEditorOGAllowedOrigins(value: string | undefined): EditorOGHandlerOptions['allowedOrigins'] {
  const setting = value?.trim();
  if (!setting) return undefined;
  if (setting === '*') return '*';
  const origins = setting.split(',').map((origin) => origin.trim());
  if (origins.some((origin) => !parseOrigin(origin))) {
    throw new Error('EDITOR_OG_ALLOWED_ORIGINS must be "*" or a comma-separated list of exact HTTP(S) origins');
  }
  return [...new Set(origins)];
}

function sendJson(res: ServerResponse, status: number, data: object) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(JSON.stringify(data));
}

/** Returns false for other routes, allowing dev/CMS middleware to continue. */
export function createEditorOGHandler(options: EditorOGHandlerOptions = {}) {
  const fetchOG = options.fetchOG ?? fetchEditorOG;
  const now = options.now ?? Date.now;
  const limit = options.requestsPerMinute ?? 120;
  const maxClients = options.maxClients ?? 1024;
  const allowedOrigins = options.allowedOrigins;
  if (allowedOrigins !== undefined && allowedOrigins !== '*' && allowedOrigins.some((origin) => !parseOrigin(origin))) {
    throw new Error('allowedOrigins must contain exact HTTP(S) origins');
  }
  const allowlist = new Set(allowedOrigins === '*' ? [] : allowedOrigins);
  const clients = new Map<string, { count: number; expiresAt: number }>();

  return async function handleEditorOGRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const rawUrl = req.url ?? '';
    if (rawUrl.split('?')[0] !== '/api/editor/og') return false;
    const origin = req.headers.origin;
    const parsedOrigin = origin === undefined ? undefined : parseOrigin(origin);
    const crossSite = req.headers['sec-fetch-site'] === 'cross-site';
    const sameOrigin = parsedOrigin?.host === req.headers.host && !crossSite;
    if (
      (origin !== undefined && (!parsedOrigin || (!sameOrigin && allowedOrigins !== '*' && !allowlist.has(origin)))) ||
      (origin === undefined && crossSite && allowedOrigins !== '*')
    ) {
      sendJson(res, 403, { error: '此来源不能使用链接预览' });
      return true;
    }
    // Set these before validation and rate limiting so browsers can read error responses too.
    if (allowedOrigins === '*') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Retry-After');
    } else if (allowedOrigins !== undefined) {
      res.setHeader('Vary', 'Origin');
      if (origin !== undefined) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Expose-Headers', 'Retry-After');
      }
    }

    if (req.method !== 'GET' && req.method !== 'OPTIONS') {
      res.setHeader('Allow', 'GET, OPTIONS');
      sendJson(res, 405, { error: '仅支持 GET 请求' });
      return true;
    }
    if (
      rawUrl.length > MAX_URL_LENGTH * 3 + 64 ||
      req.headers['transfer-encoding'] ||
      Number(req.headers['content-length']) > 0
    ) {
      sendJson(res, 400, { error: '请求仅接受一个网页链接' });
      return true;
    }
    if (req.method === 'OPTIONS') {
      if (!origin || !req.headers['access-control-request-method']) {
        sendJson(res, 400, { error: '预检请求必须包含 Origin 和 GET 方法' });
        return true;
      }
      if (req.headers['access-control-request-method'] !== 'GET') {
        res.setHeader('Allow', 'GET, OPTIONS');
        sendJson(res, 405, { error: '仅支持 GET 请求' });
        return true;
      }
      if (req.headers['access-control-request-headers']) {
        sendJson(res, 403, { error: '链接预览不接受自定义请求头' });
        return true;
      }
      res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET', 'Cache-Control': 'no-store' });
      res.end();
      return true;
    }

    const currentTime = now();
    for (const [key, entry] of clients) {
      if (entry.expiresAt <= currentTime) clients.delete(key);
    }
    // Ignore spoofable forwarding headers. Behind a proxy this is a shared request budget.
    const clientKey = req.socket.remoteAddress ?? 'unknown';
    let client = clients.get(clientKey);
    if (!client && clients.size < maxClients) {
      client = { count: 0, expiresAt: currentTime + 60_000 };
      clients.set(clientKey, client);
    }
    if (!client || client.count >= limit) {
      res.setHeader('Retry-After', '60');
      sendJson(res, 429, { error: '请求较多，请稍后重试' });
      return true;
    }
    client.count += 1;

    const params = new URL(rawUrl, 'http://editor.local').searchParams;
    if (params.size !== 1 || !params.has('url')) {
      sendJson(res, 400, { error: '请求仅接受一个 url 参数' });
      return true;
    }
    let url: string;
    try {
      url = parsePublicUrl(params.get('url') ?? '').href;
    } catch {
      sendJson(res, 400, { error: '请输入不含登录凭据的 HTTP 或 HTTPS 网页链接' });
      return true;
    }
    try {
      const data = await fetchOG(url);
      sendJson(res, 200, { ...data, html: renderLinkPreview(data) });
    } catch {
      sendJson(res, 503, { error: '链接预览暂时不可用' });
    }
    return true;
  };
}

export const handleEditorOGRequest = createEditorOGHandler({
  allowedOrigins: parseEditorOGAllowedOrigins(process.env.EDITOR_OG_ALLOWED_ORIGINS),
});

export function createEditorOGServer(options: EditorOGHandlerOptions = {}) {
  const handle = createEditorOGHandler({
    ...options,
    allowedOrigins: options.allowedOrigins ?? parseEditorOGAllowedOrigins(process.env.EDITOR_OG_ALLOWED_ORIGINS),
  });
  const server = createServer((req, res) => {
    void handle(req, res)
      .then((handled) => {
        if (!handled) sendJson(res, 404, { error: '未找到此接口' });
      })
      .catch(() => sendJson(res, 503, { error: '链接预览暂时不可用' }));
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 100;
  server.maxConnections = 64;
  return server;
}

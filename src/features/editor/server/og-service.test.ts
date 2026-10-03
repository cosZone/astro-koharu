import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import test from 'node:test';
import { createEditorOGHandler, createEditorOGServer, parseEditorOGAllowedOrigins } from './http';
import { createEditorOGService, type OGServiceOptions } from './og-service';
import { isPublicIpAddress, parsePublicUrl } from './public-url';

const publicAddresses = [{ address: '93.184.216.34', family: 4 }];
const resolve: NonNullable<OGServiceOptions['resolve']> = async () => publicAddresses;
const htmlHeaders = { 'content-type': 'text/html; charset=utf-8' };
const response = (body = '<title>Example</title>', init: ResponseInit = {}) => ({
  response: new Response(body, { headers: htmlHeaders, ...init }),
  async dispose() {},
});
const extract: NonNullable<OGServiceOptions['extract']> = async () => ({ title: 'Example' });
const defaults: OGServiceOptions = { resolve, extract, request: async () => response() };

test('rejects non-public IPv4, IPv6, mapped IPv4 and alternate literal forms', () => {
  for (const address of [
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '100.64.0.1',
    '192.0.2.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '2001:db8::1',
    '2002:7f00:1::',
  ]) {
    assert.equal(isPublicIpAddress(address), false, address);
  }
  assert.equal(isPublicIpAddress('93.184.216.34'), true);
  assert.equal(isPublicIpAddress('2606:4700:4700::1111'), true);
  assert.equal(isPublicIpAddress(parsePublicUrl('http://2130706433').hostname), false);
  assert.equal(isPublicIpAddress(parsePublicUrl('http://0x7f000001').hostname), false);
});

test('rejects credentials, non-HTTP protocols, long URLs and non-web ports', async () => {
  let calls = 0;
  const fetchOG = createEditorOGService({
    ...defaults,
    request: async () => {
      calls += 1;
      return response();
    },
  });
  for (const url of [
    'file:///etc/passwd',
    'http://user:secret@example.com',
    'http://example.com:22',
    `https://example.com/${'x'.repeat(4096)}`,
  ]) {
    assert.ok((await fetchOG(url)).error);
  }
  assert.equal(calls, 0);
});

test('rejects any mixed private/public DNS answer before sending a request', async () => {
  let calls = 0;
  const fetchOG = createEditorOGService({
    ...defaults,
    resolve: async () => [...publicAddresses, { address: '10.1.2.3', family: 4 }],
    request: async () => {
      calls += 1;
      return response();
    },
  });
  assert.match((await fetchOG('https://example.com')).error ?? '', /公开网络/);
  assert.equal(calls, 0);
});

test('validates every redirect and passes only verified addresses to the transport', async () => {
  let calls = 0;
  let disposed = false;
  const fetchOG = createEditorOGService({
    ...defaults,
    request: async (_url, addresses) => {
      calls += 1;
      assert.deepEqual(addresses, publicAddresses);
      return {
        response: new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data/' } }),
        async dispose() {
          disposed = true;
        },
      };
    },
  });
  assert.match((await fetchOG('https://example.com')).error ?? '', /公开网络/);
  assert.equal(calls, 1);
  assert.equal(disposed, true);
});

test('caps redirects and uses the final URL for relative metadata extraction', async () => {
  let calls = 0;
  const endless = createEditorOGService({
    ...defaults,
    request: async () => {
      calls += 1;
      return response('', { status: 302, headers: { location: '/loop' } });
    },
  });
  assert.match((await endless('https://example.com')).error ?? '', /重定向过多/);
  assert.equal(calls, 6);
  let finalUrl = '';
  const redirected = createEditorOGService({
    ...defaults,
    request: async (url) =>
      url.pathname === '/' ? response('', { status: 301, headers: { location: '/final' } }) : response(),
    extract: async (_html, url) => {
      finalUrl = url;
      return { title: 'Final' };
    },
  });
  const result = await redirected('https://example.com');
  assert.equal(finalUrl, 'https://example.com/final');
  assert.equal(result.originUrl, 'https://example.com/');
  assert.equal(result.url, finalUrl);
});

test('rejects non-HTML and oversized streams even without content-length', async () => {
  const notHtml = createEditorOGService({
    ...defaults,
    request: async () => response('binary', { headers: { 'content-type': 'application/octet-stream' } }),
  });
  assert.match((await notHtml('https://example.com')).error ?? '', /未返回网页/);
  const tooLarge = createEditorOGService({ ...defaults, maxHtmlBytes: 8, request: async () => response('123456789') });
  assert.match((await tooLarge('https://example.com')).error ?? '', /网页过大/);
});

test('deadline includes unresolved DNS and a stalled body stream', async () => {
  const dns = createEditorOGService({ ...defaults, timeoutMs: 15, resolve: () => new Promise(() => {}) });
  assert.match((await dns('https://example.com')).error ?? '', /超时/);
  let cancelled = false;
  const body = createEditorOGService({
    ...defaults,
    timeoutMs: 15,
    request: async () => ({
      response: new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
          },
        }),
        { headers: htmlHeaders },
      ),
      async dispose() {},
    }),
  });
  assert.match((await body('https://example.com')).error ?? '', /超时/);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cancelled, true);
});

test('same URL is deduplicated in flight; new requests over concurrency limit fail promptly', async () => {
  let unblock = () => {};
  const gate = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  let calls = 0;
  const fetchOG = createEditorOGService({
    ...defaults,
    maxConcurrent: 1,
    request: async () => {
      calls += 1;
      await gate;
      return response();
    },
  });
  const first = fetchOG('https://example.com/#a');
  const same = fetchOG('https://example.com/#b');
  assert.match((await fetchOG('https://other.example')).error ?? '', /繁忙/);
  unblock();
  const results = await Promise.all([first, same]);
  assert.equal(calls, 1);
  assert.deepEqual(results[0], results[1]);
});

test('TTL expires, cache stays bounded and callers cannot mutate cached data', async () => {
  let time = 0;
  let calls = 0;
  const fetchOG = createEditorOGService({
    ...defaults,
    now: () => time,
    maxCacheEntries: 1,
    successTtlMs: 100,
    request: async () => {
      calls += 1;
      return response();
    },
  });
  const first = await fetchOG('https://example.com/a');
  first.title = 'Changed';
  assert.equal((await fetchOG('https://example.com/a')).title, 'Example');
  assert.equal(calls, 1);
  time = 101;
  await fetchOG('https://example.com/a');
  assert.equal(calls, 2);
  await fetchOG('https://example.com/b');
  await fetchOG('https://example.com/a');
  assert.equal(calls, 4);
});

test('failures have a short cache lifetime and never expose upstream details', async () => {
  let time = 0;
  let calls = 0;
  const fetchOG = createEditorOGService({
    ...defaults,
    now: () => time,
    failureTtlMs: 10,
    request: async () => {
      calls += 1;
      throw new Error('secret: internal network stack trace');
    },
  });
  const data = await fetchOG('https://example.com');
  assert.equal(data.error, '暂时无法获取链接预览');
  await fetchOG('https://example.com');
  assert.equal(calls, 1);
  time = 11;
  await fetchOG('https://example.com');
  assert.equal(calls, 2);
});

test('real metadata parser extracts bounded fields without fetching icons', async () => {
  let calls = 0;
  const fetchOG = createEditorOGService({
    request: async () => {
      calls += 1;
      return response(
        '<html><head><title>Sample article</title><meta name="description" content="A description"><meta property="og:image" content="http://127.0.0.1/private"><link rel="icon" href="http://localhost/icon"></head></html>',
      );
    },
    resolve: async (host) => (host === 'localhost' ? [{ address: '127.0.0.1', family: 4 }] : publicAddresses),
  });
  const data = await fetchOG('https://example.com');
  assert.equal(data.error, undefined);
  assert.equal(data.title, 'Sample article');
  assert.equal(data.description, 'A description');
  assert.equal(data.image, undefined);
  assert.equal(data.logo, undefined);
  assert.equal(calls, 1);
});

function mockHttp(url: string, options: { method?: string; headers?: Record<string, string>; address?: string } = {}) {
  let body = '';
  let status = 0;
  const headers: Record<string, string> = {};
  const req = {
    url,
    method: options.method ?? 'GET',
    headers: { host: 'editor.example', ...options.headers },
    socket: { remoteAddress: options.address ?? '127.0.0.1' },
  } as IncomingMessage;
  const res = {
    setHeader(key: string, value: string) {
      headers[key] = value;
    },
    writeHead(code: number, values: Record<string, string>) {
      status = code;
      Object.assign(headers, values);
    },
    end(value = '') {
      body = value;
    },
  } as unknown as ServerResponse;
  return { req, res, result: () => ({ status, headers, data: body ? JSON.parse(body) : undefined }) };
}

test('HTTP only serves the OG route, rejects bodies and does not expose CMS/cache routes', async () => {
  const handle = createEditorOGHandler({ fetchOG: async (url) => ({ originUrl: url, url, title: 'Article' }) });
  for (const route of ['/api/cms/write', '/api/cms/og-cache', '/api/editor/og-cache']) {
    const request = mockHttp(route);
    assert.equal(await handle(request.req, request.res), false);
  }
  const rejectedRequests: Array<Parameters<typeof mockHttp>[1]> = [
    { method: 'POST' },
    { headers: { 'content-length': '1' } },
    { headers: { origin: 'https://attacker.example' } },
  ];
  for (const options of rejectedRequests) {
    const request = mockHttp('/api/editor/og?url=https://example.com', options);
    assert.equal(await handle(request.req, request.res), true);
    assert.ok(request.result().status >= 400);
  }
  const request = mockHttp('/api/editor/og?url=https://example.com');
  await handle(request.req, request.res);
  assert.equal(request.result().status, 200);
  assert.match(request.result().data.html, /link-preview-block/);
  assert.equal(request.result().headers['Cache-Control'], 'no-store');
});

test('HTTP rate limit resets and never trusts attacker-supplied forwarded IPs', async () => {
  let time = 0;
  const handle = createEditorOGHandler({
    now: () => time,
    requestsPerMinute: 1,
    fetchOG: async (url) => ({ originUrl: url, url, error: 'Unavailable' }),
  });
  const first = mockHttp('/api/editor/og?url=https://example.com');
  await handle(first.req, first.res);
  const next = mockHttp('/api/editor/og?url=https://example.com', { headers: { 'x-forwarded-for': '8.8.8.8' } });
  await handle(next.req, next.res);
  assert.equal(next.result().status, 429);
  time = 60_001;
  const reset = mockHttp('/api/editor/og?url=https://example.com');
  await handle(reset.req, reset.res);
  assert.equal(reset.result().status, 200);
});

test('CORS environment settings validate exact HTTP(S) origins before startup', () => {
  assert.equal(parseEditorOGAllowedOrigins(undefined), undefined);
  assert.equal(parseEditorOGAllowedOrigins('  '), undefined);
  assert.equal(parseEditorOGAllowedOrigins(' * '), '*');
  assert.deepEqual(parseEditorOGAllowedOrigins('https://blog.example, http://localhost:4321,https://blog.example'), [
    'https://blog.example',
    'http://localhost:4321',
  ]);
  for (const value of [
    'null',
    'file:///tmp/editor',
    'https://blog.example/',
    'https://blog.example/path',
    'https://user:password@blog.example',
    'https://blog.example?query=1',
    'https://blog.example#fragment',
    'https://blog.example,',
    '*,https://blog.example',
    'https://blog.example https://other.example',
  ]) {
    assert.throws(() => parseEditorOGAllowedOrigins(value), /EDITOR_OG_ALLOWED_ORIGINS/, value);
  }
  assert.throws(() => createEditorOGHandler({ allowedOrigins: ['https://blog.example/path'] }), /allowedOrigins/);
});

test('default HTTP remains same-origin and rejects cross-site or opaque origins without fetching', async () => {
  let calls = 0;
  const handle = createEditorOGHandler({
    fetchOG: async (url) => {
      calls += 1;
      return { originUrl: url, url, title: 'Article' };
    },
  });
  const rejectedHeaders: Array<Record<string, string>> = [
    { origin: 'https://attacker.example' },
    { 'sec-fetch-site': 'cross-site' },
    { origin: 'https://editor.example', 'sec-fetch-site': 'cross-site' },
    { origin: 'null' },
    { origin: '' },
    { origin: 'https://editor.example/path' },
  ];
  for (const headers of rejectedHeaders) {
    const request = mockHttp('/api/editor/og?url=https://example.com', { headers });
    await handle(request.req, request.res);
    assert.equal(request.result().status, 403);
    assert.equal(request.result().headers['Access-Control-Allow-Origin'], undefined);
  }
  assert.equal(calls, 0);
  const sameOrigin = mockHttp('/api/editor/og?url=https://example.com', { headers: { origin: 'https://editor.example' } });
  await handle(sameOrigin.req, sameOrigin.res);
  assert.equal(sameOrigin.result().status, 200);
  assert.equal(sameOrigin.result().headers['Access-Control-Allow-Origin'], undefined);
  assert.equal(calls, 1);
});

test('public HTTP permits valid cross-origin GET without credentials and rejects malformed origins', async () => {
  let calls = 0;
  const handle = createEditorOGHandler({
    allowedOrigins: '*',
    fetchOG: async (url) => {
      calls += 1;
      return { originUrl: url, url, title: 'Article' };
    },
  });
  const request = mockHttp('/api/editor/og?url=https://example.com', {
    headers: { origin: 'https://another-blog.example', 'sec-fetch-site': 'cross-site' },
  });
  await handle(request.req, request.res);
  assert.equal(request.result().status, 200);
  assert.equal(request.result().headers['Access-Control-Allow-Origin'], '*');
  assert.equal(request.result().headers['Access-Control-Allow-Credentials'], undefined);
  assert.equal(request.result().headers['Access-Control-Expose-Headers'], 'Retry-After');
  for (const origin of [
    'null',
    '',
    'not-an-origin',
    'file:///tmp/editor',
    'https://blog.example/path',
    'https://user:password@blog.example',
    'https://blog.example,https://other.example',
  ]) {
    const invalid = mockHttp('/api/editor/og?url=https://example.com', { headers: { origin } });
    await handle(invalid.req, invalid.res);
    assert.equal(invalid.result().status, 403, origin);
    assert.equal(invalid.result().headers['Access-Control-Allow-Origin'], undefined, origin);
  }
  assert.equal(calls, 1);
});

test('allowlist uses exact origins and Vary while retaining same-origin and local non-browser access', async () => {
  const handle = createEditorOGHandler({
    allowedOrigins: ['https://blog.example', 'http://localhost:4321'],
    fetchOG: async (url) => ({ originUrl: url, url, title: 'Article' }),
  });
  for (const origin of ['https://blog.example', 'http://localhost:4321', 'https://editor.example']) {
    const request = mockHttp('/api/editor/og?url=https://example.com', { headers: { origin } });
    await handle(request.req, request.res);
    assert.equal(request.result().status, 200, origin);
    assert.equal(request.result().headers['Access-Control-Allow-Origin'], origin);
    assert.equal(request.result().headers.Vary, 'Origin');
    assert.equal(request.result().headers['Access-Control-Allow-Credentials'], undefined);
  }
  for (const origin of ['https://blog.example:8443', 'http://blog.example', 'http://localhost:4322', 'https://other.example']) {
    const request = mockHttp('/api/editor/og?url=https://example.com', { headers: { origin, 'sec-fetch-site': 'cross-site' } });
    await handle(request.req, request.res);
    assert.equal(request.result().status, 403, origin);
    assert.equal(request.result().headers['Access-Control-Allow-Origin'], undefined);
  }
  const local = mockHttp('/api/editor/og?url=https://example.com');
  await handle(local.req, local.res);
  assert.equal(local.result().status, 200);
});

test('GET preflights never fetch or consume rate limits and reject other methods or custom headers', async () => {
  let calls = 0;
  const handle = createEditorOGHandler({
    allowedOrigins: '*',
    requestsPerMinute: 1,
    fetchOG: async (url) => {
      calls += 1;
      return { originUrl: url, url, title: 'Article' };
    },
  });
  const headers = { origin: 'https://blog.example', 'access-control-request-method': 'GET' };
  for (let index = 0; index < 3; index += 1) {
    const request = mockHttp('/api/editor/og?url=https://example.com', { method: 'OPTIONS', headers });
    await handle(request.req, request.res);
    assert.equal(request.result().status, 204);
    assert.equal(request.result().headers['Access-Control-Allow-Origin'], '*');
    assert.equal(request.result().headers['Access-Control-Allow-Methods'], 'GET');
    assert.equal(request.result().headers['Access-Control-Allow-Credentials'], undefined);
    assert.equal(request.result().data, undefined);
  }
  assert.equal(calls, 0);
  const invalid = mockHttp('/api/editor/og', {
    method: 'OPTIONS',
    headers: { ...headers, 'access-control-request-method': 'POST' },
  });
  await handle(invalid.req, invalid.res);
  assert.equal(invalid.result().status, 405);
  assert.equal(invalid.result().headers['Access-Control-Allow-Origin'], '*');
  const custom = mockHttp('/api/editor/og', {
    method: 'OPTIONS',
    headers: { ...headers, 'access-control-request-headers': 'authorization' },
  });
  await handle(custom.req, custom.res);
  assert.equal(custom.result().status, 403);
  const missing = mockHttp('/api/editor/og', { method: 'OPTIONS' });
  await handle(missing.req, missing.res);
  assert.equal(missing.result().status, 400);
  const first = mockHttp('/api/editor/og?url=https://example.com', { headers: { origin: headers.origin } });
  await handle(first.req, first.res);
  assert.equal(first.result().status, 200);
  assert.equal(calls, 1);
  const exhaustedPreflight = mockHttp('/api/editor/og', { method: 'OPTIONS', headers });
  await handle(exhaustedPreflight.req, exhaustedPreflight.res);
  assert.equal(exhaustedPreflight.result().status, 204);
});

test('public and allowlist CORS headers survive 400, 405, 429 and 503 responses', async () => {
  for (const allowedOrigins of ['*', ['https://blog.example']] as const) {
    const expectedOrigin = allowedOrigins === '*' ? '*' : 'https://blog.example';
    const headers = { origin: 'https://blog.example', 'sec-fetch-site': 'cross-site' };
    const handle = createEditorOGHandler({
      allowedOrigins,
      requestsPerMinute: 2,
      fetchOG: async () => {
        throw new Error('private upstream details');
      },
    });
    const requests = [
      [mockHttp('/api/editor/og?url=file:///private', { headers }), 400],
      [mockHttp('/api/editor/og?url=https://example.com', { method: 'POST', headers }), 405],
      [mockHttp('/api/editor/og?url=https://example.com', { headers }), 503],
      [mockHttp('/api/editor/og?url=https://example.com', { headers }), 429],
    ] as const;
    for (const [request, status] of requests) {
      await handle(request.req, request.res);
      assert.equal(request.result().status, status);
      assert.equal(request.result().headers['Access-Control-Allow-Origin'], expectedOrigin, String(status));
      assert.equal(request.result().headers['Access-Control-Allow-Credentials'], undefined);
      assert.equal(request.result().headers['Access-Control-Expose-Headers'], 'Retry-After');
      if (allowedOrigins !== '*') assert.equal(request.result().headers.Vary, 'Origin');
      if (status === 429) assert.equal(request.result().headers['Retry-After'], '60');
      if (status === 503) assert.equal(JSON.stringify(request.result().data).includes('private'), false);
    }
  }
});

test('standalone server honors injected options and environment without real upstream network requests', async (t) => {
  const previous = process.env.EDITOR_OG_ALLOWED_ORIGINS;
  t.after(() => {
    if (previous === undefined) delete process.env.EDITOR_OG_ALLOWED_ORIGINS;
    else process.env.EDITOR_OG_ALLOWED_ORIGINS = previous;
  });
  process.env.EDITOR_OG_ALLOWED_ORIGINS = '*';
  let calls = 0;
  const server = createEditorOGServer({
    fetchOG: async (url) => {
      calls += 1;
      return { originUrl: url, url, title: 'Injected offline metadata' };
    },
  });
  t.after(() => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const endpoint = `http://127.0.0.1:${address.port}/api/editor/og?url=https://example.com`;
  const result = await fetch(endpoint, { headers: { origin: 'https://another-blog.example' } });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('access-control-allow-origin'), '*');
  assert.equal((await result.json()).title, 'Injected offline metadata');
  assert.equal(calls, 1);
  process.env.EDITOR_OG_ALLOWED_ORIGINS = 'null';
  assert.throws(() => createEditorOGServer({ fetchOG: async (url) => ({ originUrl: url, url }) }), /EDITOR_OG_ALLOWED_ORIGINS/);
  assert.doesNotThrow(() => createEditorOGServer({ allowedOrigins: '*', fetchOG: async (url) => ({ originUrl: url, url }) }));
});

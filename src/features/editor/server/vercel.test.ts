import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import handler from '../../../../api/editor/og';

test('Vercel adapter shares request boundaries and always completes unmatched routes', async () => {
  const server = createServer((request, response) => {
    void handler(request, response);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const [path, options, expected] of [
      ['/unmatched', undefined, 404],
      ['/api/editor/og', undefined, 400],
      ['/api/editor/og?url=ftp://example.com', undefined, 400],
      ['/api/editor/og?url=https://example.com', { method: 'POST' }, 405],
      ['/api/editor/og?url=https://example.com', { headers: { Origin: 'https://foreign.example' } }, 403],
      ['/api/editor/og?url=http://127.0.0.1', undefined, 200],
    ] as const) {
      const response = await fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(2000) });
      assert.equal(response.status, expected, path);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.match(response.headers.get('content-type') ?? '', /application\/json/);
      const result = await response.json();
      assert.equal(typeof result.error, 'string', path);
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

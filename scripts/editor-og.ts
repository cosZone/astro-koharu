import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createEditorOGServer, parseEditorOGAllowedOrigins } from '../src/features/editor/server/http';

export function startEditorOGServer() {
  const host = process.env.EDITOR_OG_HOST ?? '127.0.0.1';
  const port = Number(process.env.EDITOR_OG_PORT ?? 4323);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('EDITOR_OG_PORT must be between 1 and 65535');
  const allowedOrigins = parseEditorOGAllowedOrigins(process.env.EDITOR_OG_ALLOWED_ORIGINS);
  const server = createEditorOGServer({ allowedOrigins });
  server.listen(port, host, () => console.log(`Editor link previews: http://${host}:${port}/api/editor/og`));
  const shutdown = () => {
    server.close();
    const forceClose = setTimeout(() => server.closeAllConnections(), 9000);
    forceClose.unref();
    server.once('close', () => clearTimeout(forceClose));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  server.once('close', () => {
    process.removeListener('SIGINT', shutdown);
    process.removeListener('SIGTERM', shutdown);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  startEditorOGServer();
}

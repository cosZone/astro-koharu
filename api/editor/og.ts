import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleEditorOGRequest } from '../../src/features/editor/server/http';

/** Vercel's Node function reuses the same bounded service as local and Docker deployments. */
export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    if (await handleEditorOGRequest(request, response)) return;
    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ error: '未找到此接口' }));
  } catch {
    if (response.destroyed || response.writableEnded) return;
    if (!response.headersSent)
      response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ error: '链接预览暂时不可用' }));
  }
}

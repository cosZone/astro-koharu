import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Context } from 'hono';
import { z } from 'zod';
import { CONTENT_DIR } from '../lib/paths';
import { hasValidMarkdownExtension, isPathSafe } from '../lib/validation';

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
// Two originals can each expand to six JSON bytes per UTF-8 byte (for example, \u0001).
// The remaining allowance covers the bounded postId and JSON framing.
const MAX_REQUEST_BYTES = MAX_SOURCE_BYTES * 2 * 6 + 8 * 1024;
const ALLOWED_ORIGINS = new Set(['http://localhost:4322', 'http://127.0.0.1:4322']);
const pendingWrites = new Map<string, Promise<void>>();
const sourceRequestSchema = z
  .object({ postId: z.string().min(1).max(1024), source: z.string(), expectedSource: z.string() })
  .strict();

type SourceErrorStatus = 400 | 403 | 404 | 409 | 413 | 415 | 422 | 500;

class SourceError extends Error {
  constructor(
    message: string,
    readonly status: SourceErrorStatus,
  ) {
    super(message);
  }
}

function checkOrigin(c: Context) {
  const origin = c.req.header('origin');
  // Non-browser local clients can omit Origin; the server also validates Host.
  if (origin !== undefined && !ALLOWED_ORIGINS.has(origin)) {
    throw new SourceError('Only the local CMS may access blog source files', 403);
  }
}

function projectRoot(c: Context): string {
  const root: unknown = c.get('projectRoot');
  if (typeof root !== 'string' || !root) throw new SourceError('CMS project is unavailable', 500);
  return root;
}

function isInside(root: string, file: string) {
  const relative = path.relative(root, file);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function resolvePostPath(root: string, postId: string): Promise<string> {
  if (
    !postId ||
    postId.length > 1024 ||
    postId.includes('\0') ||
    postId.includes('\\') ||
    !isPathSafe(postId) ||
    postId.split('/').some((part) => part === '' || part === '.' || part === '..') ||
    !hasValidMarkdownExtension(postId)
  ) {
    throw new SourceError('Invalid postId', 400);
  }

  const contentRoot = await fs.realpath(path.join(root, CONTENT_DIR));
  const requestedPath = path.resolve(contentRoot, postId);
  if (!isInside(contentRoot, requestedPath)) throw new SourceError('Invalid postId', 400);
  const filePath = await fs.realpath(requestedPath);
  if (!isInside(contentRoot, filePath)) throw new SourceError('Invalid postId', 400);
  return filePath;
}

async function readSource(filePath: string): Promise<string> {
  // A replaced final-component symlink must not be followed after path validation.
  const handle = await fs.open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) throw new SourceError('Invalid postId', 400);
    if (stats.size > MAX_SOURCE_BYTES) throw new SourceError('Blog source exceeds the 5 MiB limit', 413);
    const bytes = await handle.readFile();
    if (bytes.length > MAX_SOURCE_BYTES) throw new SourceError('Blog source exceeds the 5 MiB limit', 413);
    try {
      // Preserve a UTF-8 BOM and reject invalid encodings instead of silently replacing bytes.
      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
      throw new SourceError('Blog source must use UTF-8 encoding', 422);
    }
  } finally {
    await handle.close();
  }
}

async function readJson(c: Context): Promise<unknown> {
  if (c.req.header('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    throw new SourceError('Content-Type must be application/json', 415);
  }
  const length = c.req.header('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_REQUEST_BYTES)) {
    throw new SourceError('Request exceeds the JSON transport limit', 413);
  }

  const reader = c.req.raw.body?.getReader();
  if (!reader) throw new SourceError('Invalid JSON request', 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new SourceError('Request exceeds the JSON transport limit', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size)));
  } catch {
    throw new SourceError('Invalid JSON request', 400);
  }
}

async function withFileLock<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
  const previous = pendingWrites.get(filePath) ?? Promise.resolve();
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => held);
  pendingWrites.set(filePath, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (pendingWrites.get(filePath) === queued) pendingWrites.delete(filePath);
  }
}

async function saveSource(root: string, postId: string, source: string, expectedSource: string) {
  const filePath = await resolvePostPath(root, postId);
  await withFileLock(filePath, async () => {
    const verifyCurrent = async () => {
      if ((await resolvePostPath(root, postId)) !== filePath || (await readSource(filePath)) !== expectedSource) {
        throw new SourceError('Blog source changed; reload it before saving', 409);
      }
    };
    await verifyCurrent();
    const stats = await fs.stat(filePath);
    const temporaryPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.koharu-${randomUUID()}.tmp`);
    let ownsTemporaryFile = false;
    try {
      const handle = await fs.open(temporaryPath, 'wx', stats.mode & 0o777);
      ownsTemporaryFile = true;
      try {
        await handle.writeFile(source, 'utf8');
        await handle.chmod(stats.mode & 0o777);
        await handle.sync();
      } finally {
        await handle.close();
      }
      // Catch external edits made while writing the temporary file as well as concurrent API saves.
      await verifyCurrent();
      await fs.rename(temporaryPath, filePath);
      ownsTemporaryFile = false;
    } finally {
      if (ownsTemporaryFile) await fs.unlink(temporaryPath).catch(() => {});
    }
  });
}

function errorResponse(c: Context, error: unknown) {
  if (error instanceof SourceError) return c.json({ error: error.message }, error.status);
  const code = (error as NodeJS.ErrnoException | null)?.code;
  if (code === 'ENOENT') return c.json({ error: 'Blog source not found' }, 404);
  if (code === 'ELOOP' || code === 'ENOTDIR' || code === 'EISDIR') return c.json({ error: 'Invalid postId' }, 400);
  return c.json({ error: 'Unable to access blog source' }, 500);
}

/** GET /api/cms/source?postId=… preserves the complete UTF-8 file, including frontmatter. */
export async function sourceReadHandler(c: Context) {
  try {
    checkOrigin(c);
    const postId = c.req.query('postId') ?? '';
    const source = await readSource(await resolvePostPath(projectRoot(c), postId));
    return c.json({ postId, source });
  } catch (error) {
    return errorResponse(c, error);
  }
}

/** POST /api/cms/source updates an existing file only when its original source still matches. */
export async function sourceWriteHandler(c: Context) {
  try {
    checkOrigin(c);
    const result = sourceRequestSchema.safeParse(await readJson(c));
    if (!result.success) throw new SourceError('Expected postId, source and expectedSource strings', 400);
    const { postId, source, expectedSource } = result.data;
    for (const [field, value] of [
      ['source', source],
      ['expectedSource', expectedSource],
    ] as const) {
      if (Buffer.byteLength(value, 'utf8') > MAX_SOURCE_BYTES) {
        throw new SourceError(`${field} exceeds the 5 MiB limit`, 413);
      }
      // JSON can contain lone surrogates; writing those would replace characters and lose source fidelity.
      if (Buffer.from(value, 'utf8').toString('utf8') !== value) {
        throw new SourceError('Blog source must contain valid Unicode', 400);
      }
    }
    await saveSource(projectRoot(c), postId, source, expectedSource);
    return c.json({ success: true, postId, source });
  } catch (error) {
    return errorResponse(c, error);
  }
}

import { createKoharuClient, isKoharuError, type KoharuClient, type KoharuError } from '@coszone/koharu-astro';

const DEFAULT_TIMEOUT_MS = 8_000;
const SLOW_REQUEST_MS = 2_000;

let cachedClient: { baseUrl: string; client: KoharuClient } | undefined;

export function readKoharuSuiteUrl(): string {
  const value = process.env.KOHARU_SUITE_URL ?? import.meta.env.KOHARU_SUITE_URL;
  if (!value) {
    throw new Error('KOHARU_SUITE_URL is required when moments.enabled is true.');
  }

  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('KOHARU_SUITE_URL must be an HTTP(S) origin without credentials, query, or fragment.');
  }

  return url.origin;
}

export function getKoharuClient(): KoharuClient {
  const baseUrl = readKoharuSuiteUrl();
  if (cachedClient?.baseUrl === baseUrl) return cachedClient.client;

  const client = createKoharuClient({ baseUrl, timeoutMs: DEFAULT_TIMEOUT_MS });
  cachedClient = { baseUrl, client };
  return client;
}

export async function requestKoharu<T>(operation: string, request: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();

  try {
    const result = await request();
    const durationMs = Math.round(performance.now() - startedAt);
    if (durationMs > SLOW_REQUEST_MS) {
      console.warn(`[moments] Slow Koharu request: ${operation} (${durationMs}ms)`);
    }
    return result;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    const detail = isKoharuError(error)
      ? `kind=${error.kind} status=${error.status ?? '-'} code=${error.code ?? '-'}`
      : `kind=unknown name=${error instanceof Error ? error.name : typeof error}`;
    console.error(`[moments] Koharu request failed: ${operation} (${durationMs}ms, ${detail})`);
    throw error;
  }
}

export interface MomentsHttpError {
  status: 404 | 429 | 503;
  retryAfterSeconds?: number;
  type: 'not-found' | 'rate-limited' | 'unavailable';
}

export function toMomentsHttpError(error: unknown): MomentsHttpError {
  if (!isKoharuError(error)) return { status: 503, type: 'unavailable' };

  if (error.status === 404) return { status: 404, type: 'not-found' };
  if (error.status === 429) {
    return {
      status: 429,
      type: 'rate-limited',
      ...(error.retryAfterSeconds === null ? {} : { retryAfterSeconds: error.retryAfterSeconds }),
    };
  }
  return { status: 503, type: 'unavailable' };
}

export function isKoharuNotFound(error: unknown): error is KoharuError {
  return isKoharuError(error) && error.status === 404;
}

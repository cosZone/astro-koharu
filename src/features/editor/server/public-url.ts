import type { LookupAddress } from 'node:dns';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export class OGRequestError extends Error {}

export const MAX_URL_LENGTH = 4096;

/** Do not forward upstream errors, which may contain addresses or credentials. */
export function parsePublicUrl(value: string | URL): URL {
  if (String(value).length > MAX_URL_LENGTH) throw new OGRequestError('链接过长');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new OGRequestError('链接格式无效');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new OGRequestError('仅支持 HTTP 或 HTTPS 链接');
  if (url.username || url.password) throw new OGRequestError('不支持包含登录凭据的链接');
  if (url.port && !['80', '443'].includes(url.port)) throw new OGRequestError('不支持此链接端口');
  url.hash = '';
  return url;
}

/** The caller's deadline also bounds DNS APIs that do not accept AbortSignal. */
export function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new OGRequestError('链接预览请求超时'));
  return new Promise((resolve, reject) => {
    const abort = () => reject(new OGRequestError('链接预览请求超时'));
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

// Public-address policy shared with the CMS fetcher; validate every DNS answer and redirect.
const NON_PUBLIC_IPV4_RANGES: ReadonlyArray<readonly [network: number, prefixLength: number]> = [
  [0x00000000, 8], // Unspecified and current network
  [0x0a000000, 8], // Private network
  [0x64400000, 10], // Carrier-grade NAT
  [0x7f000000, 8], // Loopback
  [0xa9fe0000, 16], // Link-local
  [0xac100000, 12], // Private network
  [0xc0000000, 24], // IETF protocol assignments
  [0xc0000200, 24], // Documentation
  [0xc0586300, 24], // Deprecated 6to4 relay anycast
  [0xc0a80000, 16], // Private network
  [0xc6120000, 15], // Benchmarking
  [0xc6336400, 24], // Documentation
  [0xcb007100, 24], // Documentation
  [0xe0000000, 4], // Multicast
  [0xf0000000, 4], // Reserved and limited broadcast
];

function parseIPv4(address: string): number | null {
  const parts = address.split('.');
  if (parts.length !== 4) return null;

  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = (value * 256 + octet) >>> 0;
  }
  return value;
}

function isIPv4InRange(address: number, network: number, prefixLength: number): boolean {
  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (address & mask) >>> 0 === (network & mask) >>> 0;
}

function isPublicIPv4Value(address: number): boolean {
  return !NON_PUBLIC_IPV4_RANGES.some(([network, prefixLength]) => isIPv4InRange(address, network, prefixLength));
}

function parseIPv6(address: string): bigint | null {
  if (address.includes('%')) return null;

  let normalized = address.toLowerCase();
  const embeddedIPv4Match = normalized.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  const embeddedIPv4 = embeddedIPv4Match?.[1];
  if (embeddedIPv4) {
    const ipv4 = parseIPv4(embeddedIPv4);
    if (ipv4 === null) return null;
    const ipv4Start = normalized.length - embeddedIPv4.length;
    normalized = `${normalized.slice(0, ipv4Start)}${(ipv4 >>> 16).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }

  const halves = normalized.split('::');
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const omittedGroups = 8 - left.length - right.length;
  if ((halves.length === 1 && omittedGroups !== 0) || (halves.length === 2 && omittedGroups < 1)) return null;

  const groups = [...left, ...Array.from({ length: omittedGroups }, () => '0'), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[\da-f]{1,4}$/.test(group))) return null;

  return groups.reduce((value, group) => (value << 16n) | BigInt(`0x${group}`), 0n);
}

function isIPv6InRange(address: bigint, network: bigint, prefixLength: number): boolean {
  const shift = BigInt(128 - prefixLength);
  return address >> shift === network >> shift;
}

function ipv6Network(address: string): bigint {
  const parsed = parseIPv6(address);
  if (parsed === null) throw new Error(`Invalid IPv6 network constant: ${address}`);
  return parsed;
}

const IPV6_GLOBAL_UNICAST = ipv6Network('2000::');
const IPV6_MAPPED_IPV4 = ipv6Network('::ffff:0:0');
const NON_PUBLIC_IPV6_RANGES: ReadonlyArray<readonly [network: bigint, prefixLength: number]> = [
  [ipv6Network('2001::'), 23], // IETF special-purpose addresses
  [ipv6Network('2001:db8::'), 32], // Documentation
  [ipv6Network('2002::'), 16], // Deprecated 6to4
  [ipv6Network('3fff::'), 20], // Documentation
];

export function isPublicIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const parsed = parseIPv4(address);
    return parsed !== null && isPublicIPv4Value(parsed);
  }
  if (family !== 6) return false;

  const parsed = parseIPv6(address);
  if (parsed === null) return false;

  if (isIPv6InRange(parsed, IPV6_MAPPED_IPV4, 96)) {
    return isPublicIPv4Value(Number(parsed & 0xffffffffn));
  }

  if (!isIPv6InRange(parsed, IPV6_GLOBAL_UNICAST, 3)) return false;
  return !NON_PUBLIC_IPV6_RANGES.some(([network, prefixLength]) => isIPv6InRange(parsed, network, prefixLength));
}

export type ResolveAddresses = (hostname: string) => Promise<LookupAddress[]>;
export const resolveAddresses: ResolveAddresses = (hostname) => lookup(hostname, { all: true, verbatim: true });

export async function validatePublicUrl(
  value: string | URL,
  signal: AbortSignal,
  resolve: ResolveAddresses = resolveAddresses,
): Promise<{ url: URL; addresses: LookupAddress[] }> {
  signal.throwIfAborted();
  const url = parsePublicUrl(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const family = isIP(hostname);
  const addresses = family ? [{ address: hostname, family }] : await withAbort(resolve(hostname), signal);
  signal.throwIfAborted();
  if (!addresses.length || addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new OGRequestError('仅支持公开网络上的网页');
  }
  return { url, addresses };
}

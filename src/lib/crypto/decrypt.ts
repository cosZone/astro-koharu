/**
 * Browser-side AES-256-GCM decryption using Web Crypto API.
 * Used by EncryptedBlock component to decrypt content at runtime.
 *
 * Security limitations of client-side decryption:
 * - Password strength is entirely user-dependent; no server-side enforcement.
 * - Ciphertext and salt are embedded in public HTML, enabling offline brute-force.
 * - Web Crypto API mitigates JS-level timing attacks, but browser environments
 *   do not guarantee constant-time operations at the hardware level.
 * - PBKDF2 iteration count (see constants.ts) raises the cost of brute-force
 *   but cannot substitute for a strong password.
 */

import { PBKDF2_ITERATIONS } from './constants';

/** Convert Uint8Array to a fresh ArrayBuffer (fixes TS strict typing with crypto.subtle) */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return buf;
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

export async function decryptContent(cipher: string, iv: string, salt: string, password: string): Promise<string | null> {
  try {
    const cipherBuf = toArrayBuffer(fromBase64(cipher));
    const ivBuf = toArrayBuffer(fromBase64(iv));
    const saltBuf = toArrayBuffer(fromBase64(salt));
    const key = await deriveKey(password, saltBuf);

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, key, cipherBuf);

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

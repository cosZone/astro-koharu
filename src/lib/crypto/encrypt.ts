/**
 * Build-time AES-256-GCM encryption using Web Crypto API.
 * Used by rehype-encrypted-block to encrypt content during build.
 *
 * NOTE: This module uses Node.js `Buffer` API and must NOT be imported in client-side code.
 */

import { PBKDF2_ITERATIONS } from './constants';

const SALT_LENGTH = 16;
const IV_LENGTH = 12;

export interface EncryptedData {
  cipher: string;
  iv: string;
  salt: string;
}

function toBase64(buffer: ArrayBuffer): string {
  return Buffer.from(new Uint8Array(buffer)).toString('base64');
}

async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
}

export async function encryptContent(plaintext: string, password: string): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Copy to fresh ArrayBuffer to satisfy TS strict typing
  const saltBuf = salt.buffer.slice(0) as ArrayBuffer;
  const ivBuf = iv.buffer.slice(0) as ArrayBuffer;

  const key = await deriveKey(password, saltBuf);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBuf }, key, encoder.encode(plaintext));

  return {
    cipher: toBase64(encrypted),
    iv: toBase64(ivBuf),
    salt: toBase64(saltBuf),
  };
}

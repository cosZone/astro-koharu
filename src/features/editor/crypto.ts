import { PBKDF2_ITERATIONS } from '../../lib/crypto/constants';
import { escapeHtml } from '../../lib/markdown/shoka-renderers';

export interface EditorEncryptedData {
  cipher: string;
  iv: string;
  salt: string;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

/** Compatible with the build-time encrypted-post/block payload, without Node Buffer. */
export async function encryptEditorContent(html: string, password: string): Promise<EditorEncryptedData> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(html));
  return { cipher: toBase64(cipher), iv: toBase64(iv.buffer), salt: toBase64(salt.buffer) };
}

/** Returns the exact container shape consumed by the blog's EncryptedPost component. */
export async function encryptEditorPost(html: string, password: string): Promise<string> {
  const { cipher, iv, salt } = await encryptEditorContent(html, password);
  return `<div class="encrypted-post" data-cipher="${escapeHtml(cipher)}" data-iv="${escapeHtml(iv)}" data-salt="${escapeHtml(salt)}" data-pagefind-ignore=""></div>`;
}

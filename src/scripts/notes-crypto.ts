// Password-based encryption for the private notes page, shared by the build
// (encrypt, in Node) and the browser (decrypt). WebCrypto only, no deps:
// PBKDF2-SHA256 derives an AES-256-GCM key from the password.

export interface EncryptedPayload {
  v: 1;
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  data: string; // base64 ciphertext + GCM tag
}

const ITERATIONS = 600_000; // OWASP 2023 recommendation for PBKDF2-SHA256

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
  extractable = false
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string, password: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    v: 1,
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(data)),
  };
}

/** Throws if the key is wrong (GCM authentication fails). */
export async function decrypt(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.data)
  );
  return new TextDecoder().decode(plain);
}

export function payloadSalt(payload: EncryptedPayload): Uint8Array {
  return fromBase64(payload.salt);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  return toBase64(new Uint8Array(await crypto.subtle.exportKey('raw', key)));
}

export function importKey(raw: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64(raw), 'AES-GCM', false, ['decrypt']);
}

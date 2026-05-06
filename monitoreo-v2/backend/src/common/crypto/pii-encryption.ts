import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT = 'em-pii-v1';

/**
 * PII column-level encryption for Ley 21.719 compliance.
 * Uses AES-256-GCM with CONFIG_ENCRYPTION_KEY env var.
 * If key not set, operates in passthrough mode (dev only).
 *
 * Encrypted values: `pii:<iv>:<tag>:<ciphertext>` (hex)
 * HMAC index: `hmac:<hash>` — deterministic, for email lookups without decrypting.
 */

function deriveKey(): Buffer | null {
  const raw = process.env.CONFIG_ENCRYPTION_KEY;
  if (!raw) return null;
  return scryptSync(raw, SALT, 32);
}

export function encryptPii(plaintext: string): string {
  const key = deriveKey();
  if (!key) return plaintext;
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `pii:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptPii(value: string): string {
  if (!value || !value.startsWith('pii:')) return value;
  const key = deriveKey();
  if (!key) return value;
  const parts = value.split(':');
  if (parts.length !== 4) return value;
  const iv = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const ciphertext = Buffer.from(parts[3], 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}

export function isPiiEncrypted(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('pii:');
}

/**
 * Deterministic HMAC for searchable encrypted email.
 * Allows `WHERE email_hmac = hmacPii('user@example.com')` without decrypting.
 */
export function hmacPii(plaintext: string): string {
  const key = deriveKey();
  if (!key) return plaintext;
  return 'hmac:' + createHmac('sha256', key).update(plaintext.toLowerCase().trim()).digest('hex');
}

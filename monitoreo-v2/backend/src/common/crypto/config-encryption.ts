import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT = 'em-config-v1'; // static salt — key derivation per env

/** Fields in integration config that contain secrets. */
const SENSITIVE_KEYS = new Set([
  'token',
  'password',
  'apiKey',
  'secret',
]);

/**
 * Derive a 32-byte key from the env var CONFIG_ENCRYPTION_KEY.
 * Returns null if the env var is not set (encryption disabled).
 */
function deriveKey(): Buffer | null {
  const raw = process.env.CONFIG_ENCRYPTION_KEY;
  if (!raw) return null;
  return scryptSync(raw, SALT, 32);
}

/** Encrypt a single string value. Returns `enc:<iv>:<tag>:<ciphertext>` (hex). */
function encryptValue(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Decrypt a value produced by encryptValue. Returns plaintext string. */
function decryptValue(encoded: string, key: Buffer): string {
  const parts = encoded.split(':');
  if (parts.length !== 4 || parts[0] !== 'enc') {
    throw new Error('Invalid encrypted value format');
  }
  const iv = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const ciphertext = Buffer.from(parts[3], 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}

/** Check if a string looks like an encrypted value. */
function isEncrypted(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('enc:');
}

/**
 * Encrypt sensitive fields in an integration config object.
 * Only encrypts string values under known sensitive keys.
 * If CONFIG_ENCRYPTION_KEY is not set, returns config unchanged.
 */
export function encryptConfig(config: Record<string, unknown>): Record<string, unknown> {
  const key = deriveKey();
  if (!key) return config;
  return deepEncrypt(config, key);
}

/**
 * Decrypt sensitive fields in an integration config object.
 * Only decrypts values that start with `enc:`.
 * If CONFIG_ENCRYPTION_KEY is not set, returns config unchanged.
 */
export function decryptConfig(config: Record<string, unknown>): Record<string, unknown> {
  const key = deriveKey();
  if (!key) return config;
  return deepDecrypt(config, key);
}

function deepEncrypt(obj: Record<string, unknown>, key: Buffer): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k) && typeof v === 'string' && !isEncrypted(v)) {
      result[k] = encryptValue(v, key);
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      result[k] = deepEncrypt(v as Record<string, unknown>, key);
    } else {
      result[k] = v;
    }
  }
  return result;
}

function deepDecrypt(obj: Record<string, unknown>, key: Buffer): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isEncrypted(v)) {
      result[k] = decryptValue(v as string, key);
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      result[k] = deepDecrypt(v as Record<string, unknown>, key);
    } else {
      result[k] = v;
    }
  }
  return result;
}

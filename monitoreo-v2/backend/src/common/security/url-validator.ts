import { isIP } from 'net';
import { lookup } from 'dns/promises';

/**
 * Private/internal IP ranges that must NEVER be reached by user-controlled URLs.
 * Prevents SSRF attacks against internal services and cloud metadata endpoints.
 */
const BLOCKED_RANGES = [
  // IPv4 private
  { prefix: '10.', mask: 8 },
  { prefix: '172.16.', mask: 12 },
  { prefix: '172.17.', mask: 12 },
  { prefix: '172.18.', mask: 12 },
  { prefix: '172.19.', mask: 12 },
  { prefix: '172.20.', mask: 12 },
  { prefix: '172.21.', mask: 12 },
  { prefix: '172.22.', mask: 12 },
  { prefix: '172.23.', mask: 12 },
  { prefix: '172.24.', mask: 12 },
  { prefix: '172.25.', mask: 12 },
  { prefix: '172.26.', mask: 12 },
  { prefix: '172.27.', mask: 12 },
  { prefix: '172.28.', mask: 12 },
  { prefix: '172.29.', mask: 12 },
  { prefix: '172.30.', mask: 12 },
  { prefix: '172.31.', mask: 12 },
  { prefix: '192.168.', mask: 16 },
  // Loopback
  { prefix: '127.', mask: 8 },
  // Link-local
  { prefix: '169.254.', mask: 16 },
  // AWS metadata
  { prefix: '169.254.169.254', mask: 32 },
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.google',
  '169.254.169.254',
]);

function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '0.0.0.0' || ip === '::') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true;
  return BLOCKED_RANGES.some((r) => ip.startsWith(r.prefix));
}

/**
 * Validate that a URL does not point to private/internal/cloud metadata endpoints.
 * Returns error message if blocked, null if safe.
 */
export function validateExternalUrl(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return 'Invalid URL format';
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block known internal hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return `Blocked hostname: ${hostname}`;
  }

  // Block if hostname is a private IP literal
  if (isIP(hostname) && isPrivateIp(hostname)) {
    return `Blocked private IP: ${hostname}`;
  }

  // Block non-standard ports commonly used by internal services
  const port = parsed.port ? parseInt(parsed.port, 10) : null;
  if (port && (port === 5432 || port === 3306 || port === 6379 || port === 27017)) {
    return `Blocked internal service port: ${port}`;
  }

  // Block file:// and other dangerous schemes
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return `Blocked protocol: ${parsed.protocol}`;
  }

  return null;
}

/**
 * Resolve hostname to IP and check if it resolves to a private address.
 * Use this for defense-in-depth against DNS rebinding attacks.
 */
export async function validateResolvedUrl(rawUrl: string): Promise<string | null> {
  const syncError = validateExternalUrl(rawUrl);
  if (syncError) return syncError;

  try {
    const parsed = new URL(rawUrl);
    if (isIP(parsed.hostname)) return null; // Already checked in sync validation

    const { address } = await lookup(parsed.hostname);
    if (isPrivateIp(address)) {
      return `Hostname resolves to private IP: ${address}`;
    }
  } catch {
    return 'DNS resolution failed';
  }

  return null;
}

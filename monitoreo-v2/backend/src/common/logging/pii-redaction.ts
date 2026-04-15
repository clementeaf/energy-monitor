/**
 * Mask an email address for safe logging.
 * "user@example.com" → "u***@example.com"
 * Preserves first char + domain for debugging.
 */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return `${email[0]}***${email.slice(at)}`;
}

/**
 * Mask a provider ID for safe logging.
 * "1234567890" → "123***"
 */
export function maskProviderId(id: string): string {
  if (id.length <= 3) return '***';
  return `${id.slice(0, 3)}***`;
}

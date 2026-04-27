import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

/** Env vars that MUST be set in production. */
const REQUIRED_IN_PRODUCTION = [
  'JWT_SECRET',
  'COOKIE_SECRET',
  'FRONTEND_URL',
  'DB_HOST',
  'DB_PASSWORD',
  'MICROSOFT_TENANT_ID',
  'MICROSOFT_CLIENT_ID',
  'GOOGLE_CLIENT_ID',
];

/**
 * Validate that critical environment variables are set.
 * In production, missing vars cause a hard exit.
 * In dev, missing vars are logged as warnings.
 */
export function validateEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing: string[] = [];

  for (const key of REQUIRED_IN_PRODUCTION) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // JWT_SECRET must be at least 32 characters (256-bit entropy)
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    missing.push('JWT_SECRET (too short — minimum 32 characters)');
  }

  if (missing.length === 0) return;

  const message = `Environment validation failed: ${missing.join(', ')}`;

  if (isProduction) {
    logger.error(`[FATAL] ${message}. Cannot start in production without these.`);
    process.exit(1);
  } else {
    logger.warn(`${message} (ignored in development)`);
  }
}

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'dotenv';

/**
 * Carga DB_* desde backend/.env solo en desarrollo local.
 * En AWS Lambda las variables vienen de la configuración de la función; no sobrescribir con un .env empaquetado por error (evita 127.0.0.1:5434 en prod).
 */
const isLambda = Boolean(
  process.env.AWS_LAMBDA_FUNCTION_NAME ?? process.env.AWS_EXECUTION_ENV,
);

const envPath = join(__dirname, '..', '.env');
if (!isLambda && existsSync(envPath)) {
  const parsed = parse(readFileSync(envPath, 'utf8'));
  const dbKeys = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USERNAME', 'DB_PASSWORD'] as const;
  for (const key of dbKeys) {
    const raw = parsed[key];
    if (raw === undefined || raw === '') {
      continue;
    }
    process.env[key] = raw.trim();
  }
}

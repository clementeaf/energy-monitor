import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Ruta por defecto al bundle CA (copia en este directorio para el zip de Lambda).
 */
function defaultCaPath() {
  return join(__dirname, 'certs', 'rds-global-bundle.pem');
}

/**
 * Opciones SSL para `pg` contra Amazon RDS con verificación del certificado.
 * @returns {{ rejectUnauthorized: true, ca: string }}
 */
export function getPgSslOptionsForRds() {
  const caPath = process.env.RDS_CA_BUNDLE_PATH ?? defaultCaPath();
  return {
    rejectUnauthorized: true,
    ca: readFileSync(caPath, 'utf8'),
  };
}

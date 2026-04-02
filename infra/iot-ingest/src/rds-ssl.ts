import * as fs from 'node:fs';
import * as path from 'node:path';

let cachedCa: string | undefined;

/**
 * Resuelve la ruta al PEM del bundle CA global de Amazon RDS (Lambda en raíz del paquete).
 * @returns Ruta absoluta al fichero
 */
export function resolveRdsCaPath(): string {
  const envPath = process.env.RDS_CA_BUNDLE_PATH;
  if (envPath !== undefined && envPath.length > 0) {
    return envPath;
  }
  return path.join(__dirname, 'certs', 'rds-global-bundle.pem');
}

/**
 * Lee el bundle CA (cacheado).
 * @returns Contenido PEM
 */
export function getRdsCaPem(): string {
  if (cachedCa === undefined) {
    cachedCa = fs.readFileSync(resolveRdsCaPath(), 'utf8');
  }
  return cachedCa;
}

/**
 * Opciones SSL para `pg` contra RDS con verificación del certificado.
 * @returns Objeto para la propiedad `ssl` de `Client`
 */
export function getPgSslOptionsForRds(): {
  rejectUnauthorized: true;
  ca: string;
} {
  return {
    rejectUnauthorized: true,
    ca: getRdsCaPem(),
  };
}

import * as fs from 'node:fs';
import * as path from 'node:path';

let cachedCa: string | undefined;

/**
 * Resuelve la ruta al PEM del bundle CA global de Amazon RDS.
 * @returns Ruta absoluta al fichero
 */
export function resolveRdsCaPath(): string {
  const envPath = process.env.RDS_CA_BUNDLE_PATH;
  if (envPath !== undefined && envPath.length > 0) {
    return envPath;
  }
  return path.join(__dirname, '..', 'certs', 'rds-global-bundle.pem');
}

/**
 * Lee el bundle CA (cacheado en memoria tras la primera lectura).
 * @returns Contenido PEM
 */
export function getRdsCaPem(): string {
  if (cachedCa === undefined) {
    cachedCa = fs.readFileSync(resolveRdsCaPath(), 'utf8');
  }
  return cachedCa;
}

/**
 * Opciones SSL para el cliente `pg` contra RDS con verificación del certificado del servidor.
 * @returns Objeto listo para la propiedad `ssl` de `Client`
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

/**
 * Valor de `ssl` en TypeORM hacia RDS (producción o DB_SSL=true).
 * @returns false sin TLS, u opciones con CA RDS
 */
export function getTypeOrmSslForRds():
  | false
  | { rejectUnauthorized: true; ca: string } {
  const nodeEnv = process.env.NODE_ENV;
  const dbSsl = process.env.DB_SSL === 'true';
  const useSsl = nodeEnv === 'production' || dbSsl;
  if (!useSsl) {
    return false;
  }
  return getPgSslOptionsForRds();
}

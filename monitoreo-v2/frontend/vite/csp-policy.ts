/**
 * Valores de entorno usados solo en tiempo de build para componer la CSP del index.html.
 */
export interface CspBuildEnv {
  VITE_API_BASE_URL?: string;
  /** Orígenes extra para connect-src, separados por coma (p. ej. otro API o dominio de cliente). */
  VITE_CSP_EXTRA_CONNECT?: string;
}

const SCRIPT_SRC_REMOTE = [
  'https://accounts.google.com',
  'https://www.gstatic.com',
  'https://login.microsoftonline.com',
  'https://aadcdn.msauth.net',
  'https://aadcdn.msftauth.net',
] as const;

const CONNECT_SRC_DEFAULT = [
  "'self'",
  'https://energymonitor.click',
  'https://626lq125eh.execute-api.us-east-1.amazonaws.com',
  'https://login.microsoftonline.com',
  'https://graph.microsoft.com',
  'https://login.live.com',
  'https://accounts.google.com',
  'https://www.googleapis.com',
  'https://oauth2.googleapis.com',
  'https://www.google.com',
] as const;

const FRAME_SRC = [
  "'self'",
  'blob:',
  'https://login.microsoftonline.com',
  'https://login.live.com',
  'https://accounts.google.com',
  'https://www.google.com',
  'https://www.recaptcha.net',
] as const;

const FORM_ACTION = [
  "'self'",
  'https://login.microsoftonline.com',
  'https://login.live.com',
  'https://accounts.google.com',
] as const;

/**
 * Obtiene el origin de una URL absoluta, o undefined si es relativa o inválida.
 * @param baseUrl - Valor típico de VITE_API_BASE_URL
 * @returns Origin https://host o undefined
 */
export function originFromApiBaseUrl(baseUrl: string | undefined): string | undefined {
  if (baseUrl === undefined || baseUrl.length === 0) {
    return undefined;
  }
  const trimmed = baseUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return undefined;
  }
  try {
    return new URL(trimmed).origin;
  } catch {
    return undefined;
  }
}

/**
 * Construye el valor del header/meta Content-Security-Policy para el SPA en producción.
 * @param env - Variables cargadas con loadEnv en el plugin de Vite
 * @returns Directivas CSP sin el nombre del header
 */
export function buildContentSecurityPolicy(env: CspBuildEnv): string {
  const connect = new Set<string>(CONNECT_SRC_DEFAULT);
  const extra = env.VITE_CSP_EXTRA_CONNECT?.split(',') ?? [];
  for (const raw of extra) {
    const o = raw.trim();
    if (o.length > 0) {
      connect.add(o);
    }
  }
  const apiOrigin = originFromApiBaseUrl(env.VITE_API_BASE_URL);
  if (apiOrigin !== undefined) {
    connect.add(apiOrigin);
  }

  const connectSrc = Array.from(connect).sort().join(' ');

  return [
    "default-src 'self'",
    `script-src 'self' ${SCRIPT_SRC_REMOTE.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    `frame-src ${FRAME_SRC.join(' ')}`,
    `form-action ${FORM_ACTION.join(' ')}`,
    "base-uri 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/**
 * Escapa el valor del atributo content del meta CSP.
 * @param value - Cadena CSP
 * @returns Valor seguro para comillas dobles
 */
export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

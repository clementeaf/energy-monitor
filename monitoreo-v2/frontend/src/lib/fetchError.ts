import { isAxiosError } from 'axios';

export type FetchErrorKind = 'network' | 'server' | 'client' | 'unknown';

/**
 * Clasifica un error de Axios (o desconocido) para decidir copy y acciones en UI.
 * @param error - Error capturado en queryFn o catch
 * @returns Tipo de fallo para mensajes y telemetría
 */
export function getFetchErrorKind(error: unknown): FetchErrorKind {
  if (!isAxiosError(error)) {
    return 'unknown';
  }
  if (error.response == null) {
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      return 'network';
    }
    return 'unknown';
  }
  const status = error.response.status;
  if (status >= 500) {
    return 'server';
  }
  if (status >= 400) {
    return 'client';
  }
  return 'unknown';
}

/**
 * Mensaje legible en español según el tipo de error de red/HTTP.
 * @param error - Error de la petición
 * @returns Texto para mostrar al usuario
 */
export function getFetchErrorMessage(error: unknown): string {
  const kind = getFetchErrorKind(error);
  if (kind === 'network') {
    return 'No se pudo conectar con el servidor. Comprueba tu conexión o inténtalo más tarde.';
  }
  if (kind === 'server') {
    return 'El servidor no respondió correctamente. Inténtalo de nuevo en unos momentos.';
  }
  if (isAxiosError(error) && error.response != null) {
    const data = error.response.data as { message?: string } | undefined;
    if (typeof data?.message === 'string' && data.message.length > 0) {
      return data.message;
    }
    if (error.response.status === 404) {
      return 'El recurso no existe o aún no está disponible.';
    }
    if (error.response.status === 403) {
      return 'No tienes permiso para ver esta información.';
    }
  }
  if (kind === 'client') {
    return 'No se pudo completar la solicitud.';
  }
  return 'Ocurrió un error inesperado.';
}

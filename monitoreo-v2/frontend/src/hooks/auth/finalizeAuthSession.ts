import { authEndpoints } from '../../services/endpoints';
import { clearDevBearerToken, setDevBearerToken } from '../../services/api';
import type { MeResponse } from '../../types/auth';

export type AuthSessionPayload = Partial<MeResponse> & { accessToken?: string };

/**
 * Persists dev-only Bearer token returned by auth endpoints in local development.
 */
export function captureDevAccessToken(data: AuthSessionPayload): void {
  if (import.meta.env.DEV && typeof data.accessToken === 'string') {
    setDevBearerToken(data.accessToken);
  }
}

/**
 * Waits briefly between session probe attempts so cookies can settle after login.
 */
function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface FinalizeAuthSessionOptions {
  authData?: AuthSessionPayload;
  applyMeResponse: (data: MeResponse) => void;
  onFailure: (message: string) => void;
}

/**
 * Completes login after OAuth/MFA: probes /auth/me with retries, then refresh as fallback.
 */
export async function finalizeAuthSession(options: FinalizeAuthSessionOptions): Promise<void> {
  const { authData, applyMeResponse, onFailure } = options;

  if (authData) {
    captureDevAccessToken(authData);
  }

  const retryDelaysMs = [0, 50, 150, 300];

  for (const waitMs of retryDelaysMs) {
    if (waitMs > 0) {
      await delay(waitMs);
    }
    try {
      const { data } = await authEndpoints.me();
      applyMeResponse(data);
      return;
    } catch {
      // Retry — cookies or dev Bearer may not be ready on the first tick.
    }
  }

  try {
    const { data: refreshData } = await authEndpoints.refresh();
    captureDevAccessToken(refreshData);
    const { data } = await authEndpoints.me();
    applyMeResponse(data);
    return;
  } catch {
    // Fall through to failure.
  }

  const hostHint =
    typeof window !== 'undefined' && window.location.hostname === '127.0.0.1'
      ? ' Abre la app en http://localhost:5173 (no 127.0.0.1).'
      : '';
  clearDevBearerToken();
  onFailure(`No se pudo guardar la sesión.${hostHint} Cierra sesión, recarga e intenta de nuevo.`);
  throw new Error('auth_session_failed');
}

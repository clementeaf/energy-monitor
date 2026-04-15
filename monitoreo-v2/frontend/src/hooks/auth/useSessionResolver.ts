import { useEffect, useRef } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { useAuthStore } from '../../store/useAuthStore';
import { authEndpoints } from '../../services/endpoints';
import { applyTenantTheme } from '../../lib/tenant-theme';

/**
 * Marca que existe sesión de aplicación (cookie httpOnly ya establecida).
 * Se guarda en localStorage para compartir entre pestañas del mismo origen y evitar
 * un GET /api/auth/me redundante; no es el token de acceso.
 */
const SESSION_FLAG = 'has_session';

/**
 * Marca sesión activa tras login (cookie httpOnly ya emitida por el API).
 */
export function setSessionFlag(): void {
  localStorage.setItem(SESSION_FLAG, '1');
}

/**
 * Limpia la marca local si la cookie dejó de ser válida.
 */
export function clearSessionFlag(): void {
  localStorage.removeItem(SESSION_FLAG);
}

/**
 * Runs once at app level to resolve session from existing cookie.
 * Waits for MSAL to finish processing any in-flight redirect before
 * deciding there is no session — prevents the race condition where
 * clearSession() fires before MSAL can handle the redirect response.
 */
export function useSessionResolver() {
  const { setSession, clearSession } = useAuthStore();
  const { inProgress } = useMsal();
  const resolved = useRef(false);

  useEffect(() => {
    // Wait until MSAL is done handling any redirect
    if (inProgress !== InteractionStatus.None) return;
    if (resolved.current) return;
    resolved.current = true;

    // No flag = no session — skip the request entirely
    if (!localStorage.getItem(SESSION_FLAG)) {
      clearSession();
      return;
    }

    authEndpoints
      .me()
      .then(({ data }) => {
        const { buildings, ...user } = data.user;
        setSession(user, data.tenant, buildings ?? []);
        applyTenantTheme(data.tenant);
      })
      .catch(() => {
        clearSessionFlag();
        clearSession();
      });
  }, [inProgress, setSession, clearSession]);
}

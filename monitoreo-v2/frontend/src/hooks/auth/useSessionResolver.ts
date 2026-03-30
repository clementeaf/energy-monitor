import { useEffect, useRef } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { useAuthStore } from '../../store/useAuthStore';
import { authEndpoints } from '../../services/endpoints';

const SESSION_FLAG = 'has_session';

export function setSessionFlag() {
  localStorage.setItem(SESSION_FLAG, '1');
}

export function clearSessionFlag() {
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
        const root = document.documentElement;
        root.style.setProperty('--color-primary', data.tenant.primaryColor);
        root.style.setProperty('--color-secondary', data.tenant.secondaryColor);
      })
      .catch(() => {
        clearSessionFlag();
        clearSession();
      });
  }, [inProgress, setSession, clearSession]);
}

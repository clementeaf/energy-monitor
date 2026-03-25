import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { authEndpoints } from '../../services/endpoints';

const SESSION_FLAG = 'has_session';

export function setSessionFlag() {
  localStorage.setItem(SESSION_FLAG, '1');
}

export function clearSessionFlag() {
  localStorage.removeItem(SESSION_FLAG);
}

/** Runs once at app level to resolve session from existing cookie. */
export function useSessionResolver() {
  const { setSession, clearSession } = useAuthStore();
  const resolved = useRef(false);

  useEffect(() => {
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
        setSession(data.user, data.tenant);
        const root = document.documentElement;
        root.style.setProperty('--color-primary', data.tenant.primaryColor);
        root.style.setProperty('--color-secondary', data.tenant.secondaryColor);
      })
      .catch(() => {
        clearSessionFlag();
        clearSession();
      });
  }, [setSession, clearSession]);
}

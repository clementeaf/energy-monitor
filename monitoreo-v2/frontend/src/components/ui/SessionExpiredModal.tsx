import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { setSessionExpiredHandler } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useIdleTimeout } from '../../hooks/useIdleTimeout';
import api from '../../services/api';

export function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const clearSession = useAuthStore((s) => s.clearSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const idleTimeoutMinutes = useAuthStore((s) => s.idleTimeoutMinutes);

  useEffect(() => {
    setSessionExpiredHandler(() => setOpen(true));
    return () => setSessionExpiredHandler(() => {});
  }, []);

  // CYB-06: client-side idle detection mirrors backend guard
  useIdleTimeout(idleTimeoutMinutes, () => setOpen(true), isAuthenticated && !open);

  const goToLogin = useCallback(() => {
    localStorage.removeItem('has_session');
    clearSession();
    setOpen(false);
    window.location.href = '/login';
  }, [clearSession]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await api.post('/auth/refresh');
      // Token refreshed — close modal, continue working
      setOpen(false);
    } catch {
      // Refresh token also expired — must re-login
      goToLogin();
    } finally {
      setRefreshing(false);
    }
  }, [goToLogin]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]" aria-hidden="true" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-lg bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-warning/10">
            <svg className="size-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Sesión inactiva</h2>
            <p className="text-sm text-muted">Tu sesión se pausó por inactividad.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={goToLogin}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {refreshing ? 'Reconectando…' : 'Continuar trabajando'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

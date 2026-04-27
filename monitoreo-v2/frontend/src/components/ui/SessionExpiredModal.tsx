import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { setSessionExpiredHandler } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

export function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    setSessionExpiredHandler(() => setOpen(true));
    return () => setSessionExpiredHandler(() => {});
  }, []);

  const handleContinue = useCallback(() => {
    // Preserve current path so user returns after re-login
    const currentPath = window.location.pathname;
    localStorage.removeItem('has_session');
    clearSession();
    setOpen(false);
    window.location.href = '/login';
  }, [clearSession]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('has_session');
    clearSession();
    setOpen(false);
    window.location.href = '/login';
  }, [clearSession]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" aria-hidden="true" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-amber-100">
            <svg className="size-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Sesión expirada</h2>
            <p className="text-sm text-gray-500">Tu sesión ha caducado por inactividad.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="flex-1 rounded-lg bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

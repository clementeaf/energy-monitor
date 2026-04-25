import type { ReactNode } from 'react';
import { Outlet } from 'react-router';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppStore } from '../../store/useAppStore';

const SelectTenantMessage = () => (
  <div className="flex h-full items-center justify-center">
    <div className="text-center">
      <svg className="mx-auto mb-4 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
      <p className="text-lg font-semibold text-pa-text">Selecciona una empresa</p>
      <p className="mt-1 text-sm text-pa-text-muted">
        Usa el selector de empresa en la barra lateral para ver los datos de esta sección.
      </p>
    </div>
  </div>
);

/**
 * Wraps pages that require a tenant selected.
 * Shows a prompt when super_admin hasn't selected a company.
 * Non-super_admin users always pass through (they have a fixed tenant).
 */
export function RequireTenant({ children }: { children: ReactNode }) {
  const { isSuperAdmin } = usePermissions();
  const selectedTenantId = useAppStore((s) => s.selectedTenantId);

  if (isSuperAdmin && !selectedTenantId) return <SelectTenantMessage />;
  return <>{children}</>;
}

/** Route-level layout variant — renders <Outlet /> when tenant is selected. */
export function RequireTenantLayout() {
  const { isSuperAdmin } = usePermissions();
  const selectedTenantId = useAppStore((s) => s.selectedTenantId);

  if (isSuperAdmin && !selectedTenantId) return <SelectTenantMessage />;
  return <Outlet />;
}

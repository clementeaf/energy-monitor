import { useAppStore } from '../store/useAppStore';
import { reportsEndpoints } from '../services/endpoints';

/**
 * Builds report export URL with tenant override for super_admin cross-tenant views.
 * @param reportId - Report UUID
 * @returns Export download URL
 */
export function useReportExportHref(reportId: string): string {
  const tenantId = useAppStore((state) => state.selectedTenantId);
  return reportsEndpoints.exportHref(reportId, tenantId ?? undefined);
}

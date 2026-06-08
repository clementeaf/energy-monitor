import { useAppStore } from '../store/useAppStore';
import { invoicesEndpoints } from '../services/endpoints';

/**
 * Builds invoice PDF URL with tenant override for super_admin cross-tenant views.
 * @param invoiceId - Invoice UUID
 * @returns Absolute or relative PDF URL including tenantId query when needed
 */
export function useInvoicePdfUrl(invoiceId: string): string {
  const tenantId = useAppStore((state) => state.selectedTenantId);
  return invoicesEndpoints.pdfUrl(invoiceId, tenantId ?? undefined);
}

import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary, fetchDashboardPayments, fetchDashboardDocuments } from '../../services/endpoints';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
  });
}

export function useDashboardPayments() {
  return useQuery({
    queryKey: ['dashboard', 'payments'],
    queryFn: fetchDashboardPayments,
  });
}

export function useDashboardDocuments(status: string, enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'documents', status],
    queryFn: () => fetchDashboardDocuments(status),
    enabled,
  });
}

/** Fetch all document statuses (always enabled). Used in filtered modes to compute payment cards. */
export function useDashboardAllDocuments(enabled: boolean) {
  const pagado = useQuery({
    queryKey: ['dashboard', 'documents', 'pagado'],
    queryFn: () => fetchDashboardDocuments('pagado'),
    enabled,
  });
  const porVencer = useQuery({
    queryKey: ['dashboard', 'documents', 'por_vencer'],
    queryFn: () => fetchDashboardDocuments('por_vencer'),
    enabled,
  });
  const vencido = useQuery({
    queryKey: ['dashboard', 'documents', 'vencido'],
    queryFn: () => fetchDashboardDocuments('vencido'),
    enabled,
  });

  return { pagado, porVencer, vencido };
}

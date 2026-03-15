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

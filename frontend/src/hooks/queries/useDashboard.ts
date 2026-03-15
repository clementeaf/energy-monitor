import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary, fetchDashboardPayments } from '../../services/endpoints';

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

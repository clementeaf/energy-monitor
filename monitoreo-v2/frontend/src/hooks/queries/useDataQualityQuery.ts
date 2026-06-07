import { useQuery } from '@tanstack/react-query';
import { dataQualityEndpoints } from '../../services/endpoints';
import type { DataQualityReportParams } from '../../types/data-quality';
import type { BalanceAnomalyQueryParams } from '../../types/data-governance';

const KEYS = {
  report: (params: DataQualityReportParams) => ['data-quality', 'report', params] as const,
  balanceAnomalies: (params?: BalanceAnomalyQueryParams) =>
    ['data-quality', 'balance-anomalies', params ?? {}] as const,
  sloBreaches: (limit?: number) => ['data-quality', 'slo-breaches', limit ?? 50] as const,
  dataContracts: ['data-quality', 'data-contracts'] as const,
};

/**
 * Loads admin data quality report for a date range.
 */
export function useDataQualityReportQuery(
  params: DataQualityReportParams | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: KEYS.report(params ?? { from: '', to: '' }),
    queryFn: () => {
      if (!params) throw new Error('Report params required');
      return dataQualityEndpoints.report(params).then((r) => r.data);
    },
    enabled: (options?.enabled ?? true) && params != null && params.from.length > 0 && params.to.length > 0,
  });
}

/**
 * Lists meter balance anomalies for admin review.
 */
export function useBalanceAnomaliesQuery(
  params?: BalanceAnomalyQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: KEYS.balanceAnomalies(params),
    queryFn: () => dataQualityEndpoints.balanceAnomalies(params).then((r) => r.data),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Lists recent data SLO breaches.
 */
export function useSloBreachesQuery(limit = 50, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.sloBreaches(limit),
    queryFn: () => dataQualityEndpoints.sloBreaches({ limit }).then((r) => r.data),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Lists active data export contracts.
 */
export function useDataContractsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.dataContracts,
    queryFn: () => dataQualityEndpoints.dataContracts().then((r) => r.data),
    enabled: options?.enabled ?? true,
  });
}

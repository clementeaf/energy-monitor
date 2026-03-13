import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import {
  fetchBillingCenters,
  fetchBillingSummary,
  fetchBillingDetail,
  fetchBillingTariffs,
} from '../../services/endpoints';
import type { BillingCenterSummary, BillingMonthlyDetail, BillingTariff } from '../../types';

export function useBillingCenters(options: Partial<UseQueryOptions<Array<{ centerName: string }>>> = {}) {
  return useQuery({
    queryKey: ['billing', 'centers'],
    queryFn: () => fetchBillingCenters(),
    staleTime: 60_000,
    ...options,
  });
}

export interface BillingSummaryParams {
  year?: number;
  centerName?: string;
}

export function useBillingSummary(
  params: BillingSummaryParams = {},
  options: Partial<UseQueryOptions<BillingCenterSummary[]>> = {},
) {
  return useQuery({
    queryKey: ['billing', 'summary', params],
    queryFn: () => fetchBillingSummary(params),
    staleTime: 60_000,
    ...options,
  });
}

export interface BillingDetailParams {
  year?: number;
  month?: number;
  centerName?: string;
  limit?: number;
  offset?: number;
}

export function useBillingDetail(
  params: BillingDetailParams = {},
  options: Partial<UseQueryOptions<BillingMonthlyDetail[]>> = {},
) {
  return useQuery({
    queryKey: ['billing', 'detail', params],
    queryFn: () => fetchBillingDetail(params),
    staleTime: 30_000,
    ...options,
  });
}

export function useBillingTariffs(
  params: { year?: number } = {},
  options: Partial<UseQueryOptions<BillingTariff[]>> = {},
) {
  return useQuery({
    queryKey: ['billing', 'tariffs', params],
    queryFn: () => fetchBillingTariffs(params),
    staleTime: 60_000,
    ...options,
  });
}

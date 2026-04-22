import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesEndpoints } from '../../services/endpoints';
import type {
  InvoiceQueryParams,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  GenerateInvoicePayload,
} from '../../types/invoice';

const INVOICES_KEY = ['invoices'] as const;

export function useInvoicesQuery(params?: InvoiceQueryParams) {
  return useQuery({
    queryKey: [...INVOICES_KEY, params ?? {}],
    queryFn: () => invoicesEndpoints.list(params).then((r) => r.data),
  });
}

export function useMyInvoicesQuery() {
  return useQuery({
    queryKey: [...INVOICES_KEY, 'my'],
    queryFn: () => invoicesEndpoints.my().then((r) => r.data),
  });
}

export function useInvoiceLineItemsQuery(invoiceId: string | null) {
  return useQuery({
    queryKey: ['invoice-line-items', invoiceId],
    queryFn: () => invoicesEndpoints.lineItems(invoiceId!).then((r) => r.data),
    enabled: !!invoiceId,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) =>
      invoicesEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateInvoicePayload }) =>
      invoicesEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesEndpoints.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}

export function useApproveInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesEndpoints.approve(id).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}

export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesEndpoints.void(id).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}

export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateInvoicePayload) =>
      invoicesEndpoints.generate(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}

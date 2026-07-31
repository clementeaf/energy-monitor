import api from '../api';
import { API_ROUTES } from '../routes';
import type {
  Tariff, TariffBlock, CreateTariffPayload, UpdateTariffPayload, CreateTariffBlockPayload,
} from '../../types/tariff';
import type {
  Invoice, InvoiceLineItem, InvoiceQueryParams,
  CreateInvoicePayload, UpdateInvoicePayload, GenerateInvoicePayload,
} from '../../types/invoice';
import type { CnrRecord, CreateCnrPayload, UpdateCnrStatusPayload } from '../../types/cnr';

export const tariffsEndpoints = {
  list: (buildingId?: string) =>
    api.get<Tariff[]>(API_ROUTES.tariffs, { params: buildingId ? { buildingId } : undefined }),

  get: (id: string) =>
    api.get<Tariff>(`${API_ROUTES.tariffs}/${id}`),

  create: (payload: CreateTariffPayload) =>
    api.post<Tariff>(API_ROUTES.tariffs, payload),

  update: (id: string, payload: UpdateTariffPayload) =>
    api.patch<Tariff>(`${API_ROUTES.tariffs}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.tariffs}/${id}`),

  blocks: (tariffId: string) =>
    api.get<TariffBlock[]>(`${API_ROUTES.tariffs}/${tariffId}/blocks`),

  createBlock: (tariffId: string, payload: CreateTariffBlockPayload) =>
    api.post<TariffBlock>(`${API_ROUTES.tariffs}/${tariffId}/blocks`, payload),

  removeBlock: (tariffId: string, blockId: string) =>
    api.delete(`${API_ROUTES.tariffs}/${tariffId}/blocks/${blockId}`),
};

export const invoicesEndpoints = {
  list: (params?: InvoiceQueryParams) =>
    api.get<Invoice[] | { data: Invoice[]; total: number }>(API_ROUTES.invoices, { params }),

  get: (id: string) =>
    api.get<Invoice>(`${API_ROUTES.invoices}/${id}`),

  lineItems: (id: string) =>
    api.get<InvoiceLineItem[]>(`${API_ROUTES.invoices}/${id}/line-items`),

  create: (payload: CreateInvoicePayload) =>
    api.post<Invoice>(API_ROUTES.invoices, payload),

  update: (id: string, payload: UpdateInvoicePayload) =>
    api.patch<Invoice>(`${API_ROUTES.invoices}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.invoices}/${id}`),

  approve: (id: string) =>
    api.patch<Invoice>(`${API_ROUTES.invoices}/${id}/approve`),

  void: (id: string) =>
    api.patch<Invoice>(`${API_ROUTES.invoices}/${id}/void`),

  generate: (payload: GenerateInvoicePayload) =>
    api.post<Invoice>(`${API_ROUTES.invoices}/generate`, payload),

  my: (params?: { limit?: number; offset?: number }) =>
    api.get<Invoice[] | { data: Invoice[]; total: number }>(`${API_ROUTES.invoices}/my`, { params }),

  pdfUrl: (id: string, tenantId?: string) => {
    const b = import.meta.env.VITE_API_BASE_URL || '/api';
    const base = b.endsWith('/') ? b.slice(0, -1) : b;
    const path = `${base}${API_ROUTES.invoices}/${id}/pdf`;
    if (!tenantId) {
      return path;
    }
    return `${path}?tenantId=${encodeURIComponent(tenantId)}`;
  },
};

export const cnrEndpoints = {
  list: () => api.get<CnrRecord[]>(API_ROUTES.cnr),
  create: (payload: CreateCnrPayload) => api.post<CnrRecord>(API_ROUTES.cnr, payload),
  updateStatus: (id: string, payload: UpdateCnrStatusPayload) => api.patch<CnrRecord>(`${API_ROUTES.cnr}/${id}/status`, payload),
};

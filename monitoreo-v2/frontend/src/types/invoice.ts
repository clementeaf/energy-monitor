export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'sent' | 'paid' | 'voided';

export interface Invoice {
  id: string;
  tenantId: string;
  buildingId: string;
  tariffId: string | null;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  status: InvoiceStatus;
  totalNet: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  meterId: string;
  tenantUnitId: string | null;
  kwhConsumption: string;
  kwDemandMax: string;
  kvarhReactive: string;
  kwhExported: string;
  netBalance: string;
  energyCharge: string;
  demandCharge: string;
  reactiveCharge: string;
  fixedCharge: string;
  totalNet: string;
}

export interface InvoiceQueryParams {
  buildingId?: string;
  status?: InvoiceStatus;
  periodStart?: string;
  periodEnd?: string;
  limit?: number;
  offset?: number;
}

export interface CreateInvoicePayload {
  buildingId: string;
  tariffId?: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  notes?: string;
}

export interface UpdateInvoicePayload {
  tariffId?: string | null;
  periodStart?: string;
  periodEnd?: string;
  notes?: string | null;
  totalNet?: number;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
}

export interface GenerateInvoicePayload {
  buildingId: string;
  tariffId: string;
  periodStart: string;
  periodEnd: string;
  meterIds?: string[];
  tenantUnitIds?: string[];
}

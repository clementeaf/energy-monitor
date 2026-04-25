import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { MonthlyChart } from '../../components/charts/MonthlyChart';
import { Drawer } from '../../components/ui/Drawer';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { DataWidget } from '../../components/ui/DataWidget';
import { useQueryState } from '../../hooks/useQueryState';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useInvoicesQuery, useInvoiceLineItemsQuery } from '../../hooks/queries/useInvoicesQuery';
import { invoicesEndpoints } from '../../services/endpoints';
import { fmtNum, fmtClp, monthLabel } from '../../lib/formatters';
import type { Invoice, InvoiceLineItem } from '../../types/invoice';

/* ── Billing metric definitions ── */

type BillingMetricKey = 'total' | 'totalNet' | 'taxAmount';

interface MetricMeta { label: string; unit: string; isCurrency: boolean }

const BILLING_METRICS: Record<BillingMetricKey, MetricMeta> = {
  total:     { label: 'Total c/IVA', unit: 'CLP ($)', isCurrency: true },
  totalNet:  { label: 'Neto',        unit: 'CLP ($)', isCurrency: true },
  taxAmount: { label: 'IVA',         unit: 'CLP ($)', isCurrency: true },
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:    { label: 'Borrador',  cls: 'bg-gray-100 text-gray-600' },
  pending:  { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Aprobada',  cls: 'bg-green-100 text-green-700' },
  sent:     { label: 'Enviada',   cls: 'bg-blue-100 text-blue-700' },
  paid:     { label: 'Pagada',    cls: 'bg-emerald-100 text-emerald-700' },
  voided:   { label: 'Anulada',   cls: 'bg-red-100 text-red-600' },
};

/* ── Helpers ── */

function parseNum(v: string | null | undefined): number {
  if (v == null || v === '') return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

interface MonthlyBilling {
  month: string; // YYYY-MM
  totalNet: number;
  taxAmount: number;
  total: number;
  invoiceCount: number;
}

function aggregateByMonth(invoices: Invoice[]): MonthlyBilling[] {
  const map = new Map<string, MonthlyBilling>();
  for (const inv of invoices) {
    if (inv.status === 'voided') continue;
    const month = inv.periodStart.slice(0, 7);
    const existing = map.get(month);
    if (existing) {
      existing.totalNet += parseNum(inv.totalNet);
      existing.taxAmount += parseNum(inv.taxAmount);
      existing.total += parseNum(inv.total);
      existing.invoiceCount += 1;
    } else {
      map.set(month, {
        month,
        totalNet: parseNum(inv.totalNet),
        taxAmount: parseNum(inv.taxAmount),
        total: parseNum(inv.total),
        invoiceCount: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

/* ── Component ── */

type Tab = 'billing' | 'meters';

export function BuildingDetailPage() {
  const { buildingId } = useParams<{ buildingId: string }>();
  const navigate = useNavigate();

  const buildingsQuery = useBuildingsQuery();
  const building = buildingsQuery.data?.find((b) => b.id === buildingId);

  const metersQuery = useMetersQuery(buildingId);
  const invoicesQuery = useInvoicesQuery({ buildingId });

  const invoices = invoicesQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const hasInvoices = invoices.length > 0;

  const [activeTab, setActiveTab] = useState<Tab>(hasInvoices ? 'billing' : 'meters');
  const [chartMetric, setChartMetric] = useState<BillingMetricKey>('total');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  const lineItemsQuery = useInvoiceLineItemsQuery(selectedInvoiceId);
  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  // Aggregate invoices by month for chart
  const monthlyData = useMemo(() => aggregateByMonth(invoices), [invoices]);

  const chartData = useMemo(() => {
    const meta = BILLING_METRICS[chartMetric];
    return monthlyData.map((m) => ({
      label: monthLabel(m.month),
      value: m[chartMetric],
      ...(meta.isCurrency ? {} : {}),
    }));
  }, [monthlyData, chartMetric]);

  const isLoading = buildingsQuery.isPending || invoicesQuery.isPending;

  const invoicesQs = useQueryState(invoicesQuery, { isEmpty: (d) => !d || d.length === 0 });
  const metersQs = useQueryState(metersQuery, { isEmpty: (d) => !d || d.length === 0 });

  // Switch tab when invoice data arrives
  useMemo(() => {
    if (!invoicesQuery.isPending && invoices.length > 0 && activeTab === 'meters') {
      // Don't auto-switch if user explicitly chose meters
    }
  }, [invoicesQuery.isPending, invoices.length, activeTab]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => navigate('/buildings')}
          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          &larr; Volver
        </button>
        <Link to="/buildings" className="text-[13px] text-gray-500 hover:text-[var(--color-primary)]">
          Edificios
        </Link>
        <span className="text-[11px] text-gray-400">/</span>
        <span className="text-[13px] font-semibold text-gray-900">
          {building?.name ?? '—'}
        </span>
        {building?.address && (
          <span className="text-[11px] text-gray-400">— {building.address}</span>
        )}
      </div>

      {/* Tab selector */}
      <div className="flex shrink-0 gap-1 px-1">
        <TabBtn label="Facturacion" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
        <TabBtn label="Medidores" active={activeTab === 'meters'} onClick={() => setActiveTab('meters')} count={meters.length} />
      </div>

      {/* ── Billing tab ── */}
      {activeTab === 'billing' && (
        <>
          {/* Metric pills */}
          <div className="flex shrink-0 flex-wrap gap-1 px-1">
            {(Object.keys(BILLING_METRICS) as BillingMetricKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setChartMetric(key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  key === chartMetric
                    ? 'bg-[var(--color-primary,#3a5b1e)] text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {BILLING_METRICS[key].label}
              </button>
            ))}
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card className="shrink-0">
              <MonthlyChart
                data={chartData}
                seriesName={BILLING_METRICS[chartMetric].label}
                unit={BILLING_METRICS[chartMetric].unit}
                currency={BILLING_METRICS[chartMetric].isCurrency ? '$' : undefined}
                modes={['column', 'line', 'area', 'pie']}
              />
            </Card>
          )}

          {/* Invoice table */}
          <Card className="flex min-h-0 flex-1 flex-col" noPadding>
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-gray-900">Facturas del edificio</h2>
              <span className="text-[11px] text-gray-500">{invoices.length} factura{invoices.length !== 1 ? 's' : ''}</span>
            </div>
            <DataWidget
              phase={invoicesQs.phase === 'loading' ? 'ready' : invoicesQs.phase}
              error={invoicesQs.error}
              onRetry={() => { void invoicesQuery.refetch(); }}
              emptyTitle="Sin facturas"
              emptyDescription="No hay facturas para este edificio."
            >
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr>
                    <Th>N° Factura</Th>
                    <Th>Periodo</Th>
                    <Th>Estado</Th>
                    <Th>Neto ($)</Th>
                    <Th>IVA ($)</Th>
                    <Th>Total ($)</Th>
                    <Th>PDF</Th>
                  </tr>
                </thead>
                <TableStateBody
                  phase={isLoading ? 'loading' : invoices.length === 0 ? 'empty' : 'ready'}
                  colSpan={7}
                  emptyMessage="Sin facturas para este edificio."
                  skeletonWidths={['w-20', 'w-24', 'w-16', 'w-20', 'w-20', 'w-20', 'w-12']}
                >
                  {invoices.map((inv) => {
                    const st = STATUS_LABELS[inv.status] ?? STATUS_LABELS.draft;
                    return (
                      <tr
                        key={inv.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedInvoiceId(inv.id)}
                      >
                        <Td className="font-medium text-gray-900">{inv.invoiceNumber}</Td>
                        <Td>{monthLabel(inv.periodStart)} — {monthLabel(inv.periodEnd)}</Td>
                        <Td>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                            {st.label}
                          </span>
                        </Td>
                        <Td>{fmtClp(inv.totalNet)}</Td>
                        <Td>{fmtClp(inv.taxAmount)}</Td>
                        <Td className="font-medium">{fmtClp(inv.total)}</Td>
                        <Td>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={invoicesEndpoints.pdfUrl(inv.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--color-primary,#3a5b1e)] hover:opacity-70"
                              title="Descargar PDF"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                              </svg>
                            </a>
                            <button
                              type="button"
                              onClick={() => setPreviewInvoiceId(inv.id)}
                              className="text-[var(--color-primary,#3a5b1e)] hover:opacity-70"
                              title="Previsualizar PDF"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                  {/* Totals footer */}
                  {invoices.length > 0 && (
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                      <Td className="text-gray-900">Total</Td>
                      <Td>{invoices.length} factura{invoices.length !== 1 ? 's' : ''}</Td>
                      <Td />
                      <Td>{fmtClp(invoices.reduce((s, i) => s + parseNum(i.totalNet), 0))}</Td>
                      <Td>{fmtClp(invoices.reduce((s, i) => s + parseNum(i.taxAmount), 0))}</Td>
                      <Td className="font-medium">{fmtClp(invoices.reduce((s, i) => s + parseNum(i.total), 0))}</Td>
                      <Td />
                    </tr>
                  )}
                </TableStateBody>
              </table>
            </div>
            </DataWidget>
          </Card>
        </>
      )}

      {/* ── Meters tab ── */}
      {activeTab === 'meters' && (
        <Card className="flex min-h-0 flex-1 flex-col" noPadding>
          <div className="flex items-center justify-between px-6 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-gray-900">Medidores</h2>
            <span className="text-[11px] text-gray-500">{meters.length} medidor{meters.length !== 1 ? 'es' : ''}</span>
          </div>
          <DataWidget
            phase={metersQs.phase === 'loading' ? 'ready' : metersQs.phase}
            error={metersQs.error}
            onRetry={() => { void metersQuery.refetch(); }}
            emptyTitle="Sin medidores"
            emptyDescription="No hay medidores en este edificio."
          >
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
                  <Th>Nombre</Th>
                  <Th>Codigo</Th>
                  <Th>Tipo</Th>
                  <Th>Fase</Th>
                  <Th>Modelo</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <TableStateBody
                phase={metersQuery.isPending ? 'loading' : meters.length === 0 ? 'empty' : 'ready'}
                colSpan={6}
                emptyMessage="Sin medidores en este edificio."
                skeletonWidths={['w-28', 'w-20', 'w-20', 'w-20', 'w-24', 'w-16']}
              >
                {meters.map((m) => (
                  <tr
                    key={m.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/monitoring/meter/${m.id}`)}
                  >
                    <Td className="font-medium text-gray-900">{m.name}</Td>
                    <Td>{m.code}</Td>
                    <Td>{m.meterType}</Td>
                    <Td>{m.phaseType === 'three_phase' ? 'Trifasico' : 'Monofasico'}</Td>
                    <Td>{m.model ?? '—'}</Td>
                    <Td>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {m.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </Td>
                  </tr>
                ))}
              </TableStateBody>
            </table>
          </div>
          </DataWidget>
        </Card>
      )}

      {/* ── Invoice line items drawer ── */}
      <Drawer
        open={!!selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
        title={`Detalle Factura ${selectedInvoice?.invoiceNumber ?? ''}`}
        size="xl"
      >
        {lineItemsQuery.isPending && (
          <div className="flex h-32 items-center justify-center text-sm text-gray-500">Cargando...</div>
        )}
        {lineItemsQuery.data && lineItemsQuery.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <ThSm>Medidor</ThSm>
                  <ThSm>kWh</ThSm>
                  <ThSm>kW Max</ThSm>
                  <ThSm>kVArh</ThSm>
                  <ThSm>Energia ($)</ThSm>
                  <ThSm>Demanda ($)</ThSm>
                  <ThSm>Reactiva ($)</ThSm>
                  <ThSm>Fijo ($)</ThSm>
                  <ThSm>Total Neto ($)</ThSm>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lineItemsQuery.data.map((li: InvoiceLineItem) => (
                  <tr key={li.id} className="hover:bg-gray-50">
                    <TdSm className="font-medium">{li.meterId.slice(0, 8)}...</TdSm>
                    <TdSm>{fmtNum(li.kwhConsumption)}</TdSm>
                    <TdSm>{fmtNum(li.kwDemandMax, 2)}</TdSm>
                    <TdSm>{fmtNum(li.kvarhReactive)}</TdSm>
                    <TdSm>{fmtClp(li.energyCharge)}</TdSm>
                    <TdSm>{fmtClp(li.demandCharge)}</TdSm>
                    <TdSm>{fmtClp(li.reactiveCharge)}</TdSm>
                    <TdSm>{fmtClp(li.fixedCharge)}</TdSm>
                    <TdSm className="font-medium">{fmtClp(li.totalNet)}</TdSm>
                  </tr>
                ))}
                {/* Totals */}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <TdSm>Total</TdSm>
                  <TdSm>{fmtNum(sumField(lineItemsQuery.data, 'kwhConsumption'))}</TdSm>
                  <TdSm>{fmtNum(maxField(lineItemsQuery.data, 'kwDemandMax'), 2)}</TdSm>
                  <TdSm>{fmtNum(sumField(lineItemsQuery.data, 'kvarhReactive'))}</TdSm>
                  <TdSm>{fmtClp(sumField(lineItemsQuery.data, 'energyCharge'))}</TdSm>
                  <TdSm>{fmtClp(sumField(lineItemsQuery.data, 'demandCharge'))}</TdSm>
                  <TdSm>{fmtClp(sumField(lineItemsQuery.data, 'reactiveCharge'))}</TdSm>
                  <TdSm>{fmtClp(sumField(lineItemsQuery.data, 'fixedCharge'))}</TdSm>
                  <TdSm className="font-medium">{fmtClp(sumField(lineItemsQuery.data, 'totalNet'))}</TdSm>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {lineItemsQuery.data && lineItemsQuery.data.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-gray-500">Sin detalle de lineas.</div>
        )}
      </Drawer>

      {/* ── Invoice preview drawer ── */}
      <Drawer
        open={!!previewInvoiceId}
        onClose={() => setPreviewInvoiceId(null)}
        title={`Factura ${invoices.find((i) => i.id === previewInvoiceId)?.invoiceNumber ?? ''}`}
        size="xl"
      >
        {previewInvoiceId && (
          <iframe
            src={invoicesEndpoints.pdfUrl(previewInvoiceId)}
            className="h-full w-full rounded border-0"
            title="Previsualizacion factura"
          />
        )}
      </Drawer>
    </div>
  );
}

/* ── Small helpers ── */

function sumField(items: InvoiceLineItem[], field: keyof InvoiceLineItem): number {
  return items.reduce((s, li) => s + parseNum(li[field] as string), 0);
}

function maxField(items: InvoiceLineItem[], field: keyof InvoiceLineItem): number {
  return items.reduce((mx, li) => Math.max(mx, parseNum(li[field] as string)), 0);
}

function TabBtn({ label, active, onClick, count }: Readonly<{ label: string; active: boolean; onClick: () => void; count?: number }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-[var(--color-primary,#3a5b1e)] text-white'
          : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
      {count != null && <span className="ml-1 opacity-70">({count})</span>}
    </button>
  );
}

function Th({ children }: Readonly<{ children?: React.ReactNode }>) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children?: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${className}`}>{children}</td>;
}

function ThSm({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function TdSm({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-3 py-2 text-[12px] text-gray-700 ${className}`}>{children}</td>;
}

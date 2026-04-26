import { useMemo, useState, useEffect, useRef } from 'react';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Chart } from '../../components/charts/Chart';
import { ChartSkeleton } from '../../components/ui/ChartSkeleton';
import { useQueryState } from '../../hooks/useQueryState';
import { usePermissions } from '../../hooks/usePermissions';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useTariffsQuery } from '../../hooks/queries/useTariffsQuery';
import {
  useInvoicesQuery,
  useApproveInvoice,
  useVoidInvoice,
  useDeleteInvoice,
  useGenerateInvoice,
} from '../../hooks/queries/useInvoicesQuery';
import { invoicesEndpoints } from '../../services/endpoints';
import type { Invoice, InvoiceStatus, InvoiceQueryParams, GenerateInvoicePayload } from '../../types/invoice';

export interface InvoicesPageProps {
  /** Pre-filter by status when mounted from /billing/approve or /billing/history */
  defaultStatus?: InvoiceStatus | 'history';
}

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  voided: 'bg-red-100 text-red-600',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  approved: 'Aprobada',
  sent: 'Enviada',
  paid: 'Pagada',
  voided: 'Anulada',
};

function fmtCurrency(val: string | number): string {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
}

const PAGE_SIZE = 15;

export function InvoicesPage({ defaultStatus }: InvoicesPageProps = {}) {
  const [statusTab, setStatusTab] = useState<string>(defaultStatus === 'pending' ? 'pending' : defaultStatus === 'history' ? 'approved' : '');
  const [filters, setFilters] = useState<InvoiceQueryParams>({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const invoicesQuery = useInvoicesQuery(filters);
  const buildingsQuery = useBuildingsQuery();
  const qs = useQueryState(invoicesQuery, { isEmpty: (d) => !d || d.length === 0 });
  const { has } = usePermissions();
  const canWrite = has('billing', 'create');
  const canUpdate = has('billing', 'update');

  const allInvoices = qs.data ?? [];

  // Counts memoized — single pass
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { '': 0, draft: 0, pending: 0, approved: 0, paid: 0, voided: 0 };
    for (const inv of allInvoices) {
      counts[''] += 1;
      if (counts[inv.status] !== undefined) counts[inv.status] += 1;
    }
    return counts;
  }, [allInvoices]);

  // Client-side status filter
  const displayInvoices = useMemo(
    () => statusTab ? allInvoices.filter((inv) => inv.status === statusTab) : allInvoices,
    [allInvoices, statusTab],
  );

  // Monthly evolution chart data
  const monthlyChartOptions = useMemo(() => {
    if (displayInvoices.length === 0) return null;

    const byMonth = new Map<string, { net: number; total: number }>();
    for (const inv of displayInvoices) {
      const key = inv.periodStart.slice(0, 7);
      const cur = byMonth.get(key) ?? { net: 0, total: 0 };
      cur.net += parseFloat(inv.totalNet);
      cur.total += parseFloat(inv.total);
      byMonth.set(key, cur);
    }

    const sorted = Array.from(byMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return {
      chart: { type: 'column' as const, height: 260 },
      title: { text: undefined },
      xAxis: { categories: sorted.map(([m]) => m), crosshair: true },
      yAxis: { title: { text: 'CLP' } },
      tooltip: { shared: true, valuePrefix: '$', valueDecimals: 0 },
      series: [
        { type: 'column' as const, name: 'Neto', data: sorted.map(([, v]) => v.net), color: 'var(--color-primary, #3D3BF3)' },
        { type: 'line' as const, name: 'Total (c/IVA)', data: sorted.map(([, v]) => v.total), color: '#f59e0b' },
      ],
    };
  }, [displayInvoices]);

  // Infinite scroll
  const visibleInvoices = displayInvoices.slice(0, visibleCount);
  const hasMore = visibleCount < displayInvoices.length;

  // Reset visible count when filters/tab change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [statusTab, filters]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((c) => c + PAGE_SIZE); },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const approveMutation = useApproveInvoice();
  const voidMutation = useVoidInvoice();
  const deleteMutation = useDeleteInvoice();
  const generateMutation = useGenerateInvoice();

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Facturas</h1>
        <div className="flex items-center gap-3">
          <DropdownSelect
            options={[
              { value: '', label: 'Todos los edificios' },
              ...(buildingsQuery.data?.map((b) => ({ value: b.id, label: b.name })) ?? []),
            ]}
            value={filters.buildingId ?? ''}
            onChange={(val) => setFilters({ ...filters, buildingId: val || undefined })}
            className="w-48"
          />
          {canWrite && (
            <button
              type="button"
              onClick={() => setGenerateOpen(true)}
              className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Generar Factura
            </button>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1">
        {[
          { value: '', label: 'Todas' },
          { value: 'pending', label: 'Pendientes' },
          { value: 'approved', label: 'Aprobadas' },
          { value: 'paid', label: 'Pagadas' },
          { value: 'voided', label: 'Anuladas' },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusTab(tab.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusTab === tab.value
                ? 'bg-[var(--color-primary,#3a5b1e)] text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
            {statusCounts[tab.value] > 0 && (
              <span className="ml-1 opacity-70">({statusCounts[tab.value]})</span>
            )}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-700">Evolución mensual</h2>
        {invoicesQuery.isLoading ? (
          <ChartSkeleton height={260} />
        ) : monthlyChartOptions ? (
          <Chart options={monthlyChartOptions} />
        ) : null}
      </div>

      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">N° Factura</th>
              <th className="px-4 py-3">Periodo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Neto</th>
              <th className="px-4 py-3 text-right">IVA</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={7}
            error={qs.error}
            onRetry={() => { invoicesQuery.refetch(); }}
            emptyMessage="No hay facturas registradas."
            skeletonWidths={['w-24', 'w-32', 'w-20', 'w-24', 'w-20', 'w-24', 'w-28']}
          >
            {visibleInvoices.map((inv) => (
              <InvoiceRow
                key={inv.id}
                invoice={inv}
                canUpdate={canUpdate}
                canWrite={canWrite}
                onPreview={() => setPreviewInvoiceId(inv.id)}
                onApprove={() => approveMutation.mutate(inv.id)}
                onVoid={() => voidMutation.mutate(inv.id)}
                onDelete={() => setDeleting(inv)}
              />
            ))}
          </TableStateBody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar Factura"
        message={`¿Eliminar la factura "${deleting?.invoiceNumber}"? Solo facturas en borrador pueden eliminarse.`}
        isPending={deleteMutation.isPending}
      />

      {generateOpen && (
        <GenerateModal
          onClose={() => setGenerateOpen(false)}
          onGenerate={(payload) => {
            generateMutation.mutate(payload, { onSuccess: () => setGenerateOpen(false) });
          }}
          isPending={generateMutation.isPending}
        />
      )}

      <Drawer
        open={!!previewInvoiceId}
        onClose={() => setPreviewInvoiceId(null)}
        title={`Factura ${displayInvoices.find((i) => i.id === previewInvoiceId)?.invoiceNumber ?? ''}`}
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

function InvoiceRow({
  invoice,
  canUpdate,
  canWrite,
  onPreview,
  onApprove,
  onVoid,
  onDelete,
}: {
  invoice: Invoice;
  canUpdate: boolean;
  canWrite: boolean;
  onPreview: () => void;
  onApprove: () => void;
  onVoid: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">{invoice.invoiceNumber}</td>
      <td className="px-4 py-3 text-gray-600">
        {invoice.periodStart} — {invoice.periodEnd}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[invoice.status]}`}>
          {STATUS_LABEL[invoice.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-mono text-gray-700">{fmtCurrency(invoice.totalNet)}</td>
      <td className="px-4 py-3 text-right font-mono text-gray-700">{fmtCurrency(invoice.taxAmount)}</td>
      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">{fmtCurrency(invoice.total)}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <a
            href={invoicesEndpoints.pdfUrl(invoice.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-700"
            title="Descargar PDF"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
            </svg>
          </a>
          <button
            type="button"
            onClick={onPreview}
            className="text-gray-500 hover:text-gray-700"
            title="Previsualizar PDF"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          {canUpdate && invoice.status === 'pending' && (
            <button type="button" onClick={onApprove} className="text-xs text-green-600 hover:text-green-800">
              Aprobar
            </button>
          )}
          {canUpdate && invoice.status !== 'voided' && (
            <button type="button" onClick={onVoid} className="text-xs text-orange-500 hover:text-orange-700">
              Anular
            </button>
          )}
          {canWrite && invoice.status === 'draft' && (
            <button type="button" onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">
              Eliminar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function GenerateModal({
  onClose,
  onGenerate,
  isPending,
}: {
  onClose: () => void;
  onGenerate: (payload: GenerateInvoicePayload) => void;
  isPending: boolean;
}) {
  const buildingsQuery = useBuildingsQuery();
  const [buildingId, setBuildingId] = useState('');
  const tariffsQuery = useTariffsQuery(buildingId || undefined);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: GenerateInvoicePayload = {
      buildingId: fd.get('buildingId') as string,
      tariffId: fd.get('tariffId') as string,
      periodStart: fd.get('periodStart') as string,
      periodEnd: fd.get('periodEnd') as string,
    };
    onGenerate(payload);
  };

  return (
    <Modal open onClose={onClose} title="Generar Factura">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Edificio</label>
          <select
            name="buildingId"
            required
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {buildingsQuery.data?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tarifa</label>
          <select name="tariffId" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Seleccionar...</option>
            {tariffsQuery.data?.filter((t) => t.isActive).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Desde</label>
            <input name="periodStart" type="date" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Hasta</label>
            <input name="periodEnd" type="date" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Se generará una factura con un line item por cada medidor activo del edificio, calculando consumo, demanda y cargos según los bloques de la tarifa seleccionada.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {isPending ? 'Generando...' : 'Generar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { useMemo, useState } from 'react';
import { DataWidget } from '../../components/ui/DataWidget';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Chart } from '../../components/charts/Chart';
import { useQueryState } from '../../hooks/useQueryState';
import { usePermissions } from '../../hooks/usePermissions';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useTariffsQuery } from '../../hooks/queries/useTariffsQuery';
import {
  useInvoicesQuery,
  useInvoiceLineItemsQuery,
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

export function InvoicesPage({ defaultStatus }: InvoicesPageProps = {}) {
  const initialStatus = defaultStatus === 'history' ? undefined : defaultStatus;
  const [filters, setFilters] = useState<InvoiceQueryParams>(
    initialStatus ? { status: initialStatus, limit: 10 } : { limit: 10 },
  );
  const invoicesQuery = useInvoicesQuery(filters);
  const buildingsQuery = useBuildingsQuery();
  const qs = useQueryState(invoicesQuery, { isEmpty: (d) => !d || d.length === 0 });
  const { has } = usePermissions();
  const canWrite = has('billing', 'create');
  const canUpdate = has('billing', 'update');

  // Filter for history mode: only completed statuses
  const displayInvoices = useMemo(() => {
    const data = qs.data ?? [];
    if (defaultStatus === 'history') {
      return data.filter((inv) => ['approved', 'sent', 'paid', 'voided'].includes(inv.status));
    }
    return data;
  }, [qs.data, defaultStatus]);

  // Monthly evolution chart data
  const monthlyChartOptions = useMemo(() => {
    const source = defaultStatus === 'history' ? displayInvoices : (qs.data ?? []);
    if (source.length === 0) return null;

    const byMonth = new Map<string, { net: number; total: number; count: number }>();
    for (const inv of source) {
      const key = inv.periodStart.slice(0, 7); // YYYY-MM
      const cur = byMonth.get(key) ?? { net: 0, total: 0, count: 0 };
      cur.net += parseFloat(inv.totalNet);
      cur.total += parseFloat(inv.total);
      cur.count += 1;
      byMonth.set(key, cur);
    }

    const sorted = Array.from(byMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const categories = sorted.map(([m]) => m);
    const netData = sorted.map(([, v]) => v.net);
    const totalData = sorted.map(([, v]) => v.total);

    return {
      chart: { type: 'column' as const, height: 260 },
      title: { text: undefined },
      xAxis: { categories, crosshair: true },
      yAxis: { title: { text: 'CLP' } },
      tooltip: {
        shared: true,
        valuePrefix: '$',
        valueDecimals: 0,
      },
      series: [
        { type: 'column' as const, name: 'Neto', data: netData, color: 'var(--color-primary, #3D3BF3)' },
        { type: 'line' as const, name: 'Total (c/IVA)', data: totalData, color: '#f59e0b' },
      ],
    };
  }, [qs.data, displayInvoices, defaultStatus]);

  const [detailId, setDetailId] = useState<string | null>(null);
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
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          {defaultStatus === 'pending' ? 'Aprobación de Facturas' : defaultStatus === 'history' ? 'Historial de Facturación' : 'Facturas'}
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={filters.buildingId ?? ''}
            onChange={(e) => setFilters({ ...filters, buildingId: e.target.value || undefined })}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos los edificios</option>
            {buildingsQuery.data?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={filters.status ?? ''}
            onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as InvoiceStatus | undefined })}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
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

      {monthlyChartOptions && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-medium text-gray-700">Evolución mensual</h2>
          <Chart options={monthlyChartOptions} />
        </div>
      )}

      <DataWidget phase={qs.phase} error={qs.error} refetch={qs.refetch} emptyMessage="No hay facturas">
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
            <tbody className="divide-y divide-gray-100">
              {displayInvoices.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  invoice={inv}
                  canUpdate={canUpdate}
                  canWrite={canWrite}
                  onViewDetail={() => setDetailId(inv.id)}
                  onApprove={() => approveMutation.mutate(inv.id)}
                  onVoid={() => voidMutation.mutate(inv.id)}
                  onDelete={() => setDeleting(inv)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </DataWidget>

      {detailId && (
        <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
      )}

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
    </div>
  );
}

function InvoiceRow({
  invoice,
  canUpdate,
  canWrite,
  onViewDetail,
  onApprove,
  onVoid,
  onDelete,
}: {
  invoice: Invoice;
  canUpdate: boolean;
  canWrite: boolean;
  onViewDetail: () => void;
  onApprove: () => void;
  onVoid: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <button type="button" onClick={onViewDetail} className="font-medium text-[var(--color-primary,#3D3BF3)] hover:underline">
          {invoice.invoiceNumber}
        </button>
      </td>
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
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            PDF
          </a>
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

function InvoiceDetailModal({ invoiceId, onClose }: Readonly<{ invoiceId: string; onClose: () => void }>) {
  const lineItemsQuery = useInvoiceLineItemsQuery(invoiceId);

  return (
    <Modal open onClose={onClose} title="Detalle de Factura">
      {lineItemsQuery.isPending && <p className="text-sm text-gray-400">Cargando...</p>}
      {lineItemsQuery.isError && <p className="text-sm text-red-500">Error cargando line items</p>}
      {lineItemsQuery.data && lineItemsQuery.data.length === 0 && (
        <p className="text-sm text-gray-400">Sin detalle de items</p>
      )}
      {lineItemsQuery.data && lineItemsQuery.data.length > 0 && (
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-left text-gray-500">
                <th className="pb-2">Medidor</th>
                <th className="pb-2 text-right">kWh</th>
                <th className="pb-2 text-right">kW Max</th>
                <th className="pb-2 text-right">Energia</th>
                <th className="pb-2 text-right">Demanda</th>
                <th className="pb-2 text-right">Reactiva</th>
                <th className="pb-2 text-right">Fijo</th>
                <th className="pb-2 text-right font-semibold">Total Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineItemsQuery.data.map((li) => (
                <tr key={li.id}>
                  <td className="py-1.5 font-mono">{li.meterId.slice(0, 8)}</td>
                  <td className="py-1.5 text-right">{li.kwhConsumption}</td>
                  <td className="py-1.5 text-right">{li.kwDemandMax}</td>
                  <td className="py-1.5 text-right">{fmtCurrency(li.energyCharge)}</td>
                  <td className="py-1.5 text-right">{fmtCurrency(li.demandCharge)}</td>
                  <td className="py-1.5 text-right">{fmtCurrency(li.reactiveCharge)}</td>
                  <td className="py-1.5 text-right">{fmtCurrency(li.fixedCharge)}</td>
                  <td className="py-1.5 text-right font-semibold">{fmtCurrency(li.totalNet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
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

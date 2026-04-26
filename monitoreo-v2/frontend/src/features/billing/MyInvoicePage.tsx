import { useMemo, useState, type ReactElement } from 'react';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { useMyInvoicesQuery } from '../../hooks/queries/useInvoicesQuery';
import { invoicesEndpoints } from '../../services/endpoints';
import { Chart } from '../../components/charts/Chart';
import { ChartSkeleton } from '../../components/ui/ChartSkeleton';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { useQueryState } from '../../hooks/useQueryState';
import type { Invoice, InvoiceStatus } from '../../types/invoice';

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

/**
 * Portal locatario — vista simplificada de mis facturas.
 * Ruta: `/billing/my-invoice`
 */
export function MyInvoicePage(): ReactElement {
  const [monthFilter, setMonthFilter] = useState('');
  const invoicesQuery = useMyInvoicesQuery({ limit: 10 });
  const qs = useQueryState(invoicesQuery, { isEmpty: (d) => !d || d.length === 0 });

  const invoices = invoicesQuery.data ?? [];

  // Filter by month
  const filtered = useMemo(() => {
    if (!monthFilter) return invoices;
    return invoices.filter((inv) => inv.periodStart.startsWith(monthFilter));
  }, [invoices, monthFilter]);

  // Available months for selector
  const months = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => set.add(inv.periodStart.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [invoices]);

  // Monthly consumption chart (last 6 months)
  const chartOptions = useMemo(() => {
    if (invoices.length === 0) return null;

    const byMonth = new Map<string, number>();
    for (const inv of invoices) {
      const key = inv.periodStart.slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + parseFloat(inv.total));
    }

    const sorted = Array.from(byMonth.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);

    return {
      chart: { type: 'column' as const, height: 240 },
      title: { text: undefined },
      xAxis: { categories: sorted.map(([m]) => m), crosshair: true },
      yAxis: { title: { text: 'CLP' } },
      tooltip: { valuePrefix: '$', valueDecimals: 0 },
      legend: { enabled: false },
      series: [{
        type: 'column' as const,
        name: 'Total facturado',
        data: sorted.map(([, v]) => v),
        color: 'var(--color-primary, #3D3BF3)',
      }],
    };
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mi Factura</h1>
          <p className="mt-0.5 text-sm text-gray-500">Historial de facturación de sus espacios asignados.</p>
        </div>
        <DropdownSelect
          options={[
            { value: '', label: 'Todos los meses' },
            ...months.map((m) => ({ value: m, label: m })),
          ]}
          value={monthFilter}
          onChange={(val) => setMonthFilter(val)}
          className="w-44"
        />
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-700">Mi consumo mensual (últimos 6 meses)</h2>
        {invoicesQuery.isLoading ? (
          <ChartSkeleton height={240} />
        ) : chartOptions ? (
          <Chart options={chartOptions} />
        ) : null}
      </div>

      {/* Table */}
      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Periodo</th>
              <th className="px-4 py-2">N° Factura</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">PDF</th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={5}
            error={qs.error}
            onRetry={() => { invoicesQuery.refetch(); }}
            emptyMessage="No hay facturas asociadas a su cuenta."
            skeletonWidths={['w-32', 'w-24', 'w-20', 'w-24', 'w-20']}
          >
            {filtered.map((inv) => (
              <MyInvoiceRow key={inv.id} invoice={inv} />
            ))}
          </TableStateBody>
        </table>
      </div>
    </div>
  );
}

function MyInvoiceRow({ invoice }: Readonly<{ invoice: Invoice }>): ReactElement {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-gray-700">{invoice.periodStart} — {invoice.periodEnd}</td>
      <td className="px-4 py-3 font-medium text-gray-900">{invoice.invoiceNumber}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[invoice.status]}`}>
          {STATUS_LABEL[invoice.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
        {fmtCurrency(invoice.total)}
      </td>
      <td className="px-4 py-3 text-right">
        <a
          href={invoicesEndpoints.pdfUrl(invoice.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-[var(--color-primary,#3D3BF3)] hover:underline"
        >
          Descargar
        </a>
      </td>
    </tr>
  );
}

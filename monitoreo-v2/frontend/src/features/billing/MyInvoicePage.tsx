import { useMemo, useState, type ReactElement } from 'react';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { useMyInvoicesQuery } from '../../hooks/queries/useInvoicesQuery';
import { useInvoicePdfUrl } from '../../hooks/useInvoicePdfUrl';
import { Chart } from '../../components/charts/Chart';
import { ChartSkeleton } from '../../components/ui/ChartSkeleton';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { useQueryState } from '../../hooks/useQueryState';
import type { Invoice, InvoiceStatus } from '../../types/invoice';
import { PageHeader } from '../../components/ui/PageHeader';

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: 'bg-raised text-muted',
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  sent: 'bg-info/10 text-info',
  paid: 'bg-success/10 text-success',
  voided: 'bg-danger/10 text-danger',
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
        color: 'var(--color-chart-1, #3a5b1e)',
      }],
    };
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <PageHeader title="Mi Factura" eyebrow="Facturación" />
          <p className="mt-0.5 text-sm text-muted">Historial de facturación de sus espacios asignados.</p>
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
      <div className="panel p-4">
        <h2 className="mb-2 text-sm font-medium text-foreground">Mi consumo mensual (últimos 6 meses)</h2>
        {invoicesQuery.isLoading ? (
          <ChartSkeleton height={240} />
        ) : chartOptions ? (
          <Chart options={chartOptions} />
        ) : null}
      </div>

      {/* Table */}
      <div className="overflow-auto panel">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface text-left text-xs font-medium uppercase text-muted">
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
  const pdfUrl = useInvoicePdfUrl(invoice.id);

  return (
    <tr className="hover:bg-surface">
      <td className="px-4 py-3 text-foreground">{invoice.periodStart} — {invoice.periodEnd}</td>
      <td className="px-4 py-3 font-medium text-foreground">{invoice.invoiceNumber}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[invoice.status]}`}>
          {STATUS_LABEL[invoice.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
        {fmtCurrency(invoice.total)}
      </td>
      <td className="px-4 py-3 text-right">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-foreground hover:underline"
        >
          Descargar
        </a>
      </td>
    </tr>
  );
}

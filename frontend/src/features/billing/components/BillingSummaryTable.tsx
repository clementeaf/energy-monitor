import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../../components/ui/DataTable';
import type { BillingCenterSummary } from '../../../types';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatKwh(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value);
}

function formatKw(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(value);
}

function formatPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

const columns: ColumnDef<BillingCenterSummary, unknown>[] = [
  { accessorKey: 'centerName', header: 'Centro' },
  { accessorKey: 'year', header: 'Año' },
  {
    id: 'month',
    accessorFn: (row) => MONTH_NAMES[row.month - 1] ?? row.month,
    header: 'Mes',
  },
  {
    accessorKey: 'totalConsumptionKwh',
    header: 'Consumo total (kWh)',
    cell: ({ getValue }) => formatKwh(getValue() as number | null),
  },
  {
    accessorKey: 'peakMaxKw',
    header: 'Peak máx (kW)',
    cell: ({ getValue }) => formatKw(getValue() as number | null),
  },
  {
    accessorKey: 'avgDailyKwh',
    header: 'Promedio diario (kWh)',
    cell: ({ getValue }) => formatKwh(getValue() as number | null),
  },
  {
    accessorKey: 'pctPunta',
    header: '% Punta',
    cell: ({ getValue }) => formatPct(getValue() as number | null),
  },
  { accessorKey: 'topConsumerLocal', header: 'Local mayor consumo' },
];

interface BillingSummaryTableProps {
  data: BillingCenterSummary[];
  isLoading: boolean;
}

/**
 * Tabla de resumen ejecutivo por centro y mes.
 */
export function BillingSummaryTable({ data, isLoading }: BillingSummaryTableProps) {
  if (isLoading) {
    return (
      <div className="rounded border border-border bg-raised px-4 py-8 text-center text-muted">
        Cargando resumen…
      </div>
    );
  }
  if (!data.length) {
    return (
      <div className="rounded border border-border bg-raised px-4 py-8 text-center text-muted">
        No hay datos de resumen.
      </div>
    );
  }
  return (
    <DataTable
      data={data}
      columns={columns}
      className="min-h-[200px]"
    />
  );
}

import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../../components/ui/DataTable';
import type { BillingMonthlyDetail } from '../../../types';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toNum(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatKwh(value: unknown): string {
  const n = toNum(value);
  if (n === null) return '—';
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(n);
}

function formatKw(value: unknown): string {
  const n = toNum(value);
  if (n === null) return '—';
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(n);
}

function formatClp(value: unknown): string {
  const n = toNum(value);
  if (n === null) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

const columns: ColumnDef<BillingMonthlyDetail, unknown>[] = [
  { accessorKey: 'centerName', header: 'Centro' },
  { accessorKey: 'year', header: 'Año' },
  {
    id: 'month',
    accessorFn: (row) => {
      const m = toNum(row.month) ?? 0;
      return (m >= 1 && m <= 12 ? MONTH_NAMES[m - 1] : null) ?? row.month;
    },
    header: 'Mes',
  },
  { accessorKey: 'meterId', header: 'Medidor' },
  { accessorKey: 'storeType', header: 'Tipo local' },
  { accessorKey: 'storeName', header: 'Nombre local' },
  { accessorKey: 'phase', header: 'Fase' },
  {
    accessorKey: 'consumptionKwh',
    header: 'Consumo (kWh)',
    cell: ({ getValue }) => formatKwh(getValue()),
  },
  {
    accessorKey: 'peakKw',
    header: 'Peak (kW)',
    cell: ({ getValue }) => formatKw(getValue()),
  },
  {
    accessorKey: 'fixedChargeClp',
    header: 'Cargo fijo',
    cell: ({ getValue }) => formatClp(getValue()),
  },
  {
    accessorKey: 'totalNetClp',
    header: 'Total neto',
    cell: ({ getValue }) => formatClp(getValue()),
  },
  {
    accessorKey: 'ivaClp',
    header: 'IVA',
    cell: ({ getValue }) => formatClp(getValue()),
  },
  {
    accessorKey: 'totalWithIvaClp',
    header: 'Total con IVA',
    cell: ({ getValue }) => formatClp(getValue()),
  },
];

const PAGE_SIZE = 50;

interface BillingDetailTableProps {
  data: BillingMonthlyDetail[];
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
}

/**
 * Tabla de detalle mensual por centro, mes y medidor con paginación.
 */
export function BillingDetailTable({
  data,
  isLoading,
  page,
  onPageChange,
  hasNextPage,
}: BillingDetailTableProps) {
  const from = page * PAGE_SIZE + 1;
  const to = page * PAGE_SIZE + data.length;

  if (isLoading) {
    return (
      <div className="rounded border border-border bg-raised px-4 py-8 text-center text-muted">
        Cargando detalle…
      </div>
    );
  }
  if (!data.length && page === 0) {
    return (
      <div className="rounded border border-border bg-raised px-4 py-8 text-center text-muted">
        No hay datos de detalle.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Mostrando {from}–{to}
          {hasNextPage ? '+' : ''}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            className="rounded border border-border bg-raised px-3 py-1.5 text-sm text-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage}
            className="rounded border border-border bg-raised px-3 py-1.5 text-sm text-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
          >
            Siguiente
          </button>
        </div>
      </div>
      <DataTable
        data={data}
        columns={columns}
        className="min-h-[200px]"
      />
    </div>
  );
}

export { PAGE_SIZE as BILLING_DETAIL_PAGE_SIZE };

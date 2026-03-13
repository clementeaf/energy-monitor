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

function monthLabel(row: BillingMonthlyDetail): string {
  const m = toNum(row.month) ?? 0;
  return (m >= 1 && m <= 12 ? MONTH_NAMES[m - 1] : null) ?? String(row.month ?? '—');
}

/**
 * Agrupa filas consecutivas por centerName para mostrar Centro una sola vez por bloque.
 */
function groupByCenter(data: BillingMonthlyDetail[]): Array<{ centerName: string; rows: BillingMonthlyDetail[] }> {
  const groups: Array<{ centerName: string; rows: BillingMonthlyDetail[] }> = [];
  for (const row of data) {
    const name = row.centerName ?? '';
    if (groups.length > 0 && groups[groups.length - 1].centerName === name) {
      groups[groups.length - 1].rows.push(row);
    } else {
      groups.push({ centerName: name, rows: [row] });
    }
  }
  return groups;
}

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
 * La columna Centro se muestra una sola vez por bloque (rowSpan) para evitar repetición.
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
  const sorted = [...data].sort((a, b) => {
    const c = (a.centerName ?? '').localeCompare(b.centerName ?? '');
    if (c !== 0) return c;
    return (toNum(a.year) ?? 0) - (toNum(b.year) ?? 0) || (toNum(a.month) ?? 0) - (toNum(b.month) ?? 0);
  });
  const groups = groupByCenter(sorted);

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
      <div className="min-h-[200px] overflow-auto border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-raised">
              <th className="sticky top-0 z-10 bg-raised px-4 py-3 font-semibold text-text">Centro</th>
              <th className="sticky top-0 z-10 bg-raised px-4 py-3 font-semibold text-text">Año</th>
              <th className="sticky top-0 z-10 bg-raised px-4 py-3 font-semibold text-text">Mes</th>
              <th className="sticky top-0 z-10 bg-raised px-4 py-3 font-semibold text-text">Medidor</th>
              <th className="sticky top-0 z-10 bg-raised px-4 py-3 font-semibold text-text">Tipo local</th>
              <th className="sticky top-0 z-10 bg-raised px-4 py-3 font-semibold text-text">Nombre local</th>
              <th className="sticky top-0 z-10 bg-raised px-4 py-3 font-semibold text-text">Fase</th>
              <th className="sticky top-0 z-10 bg-raised px-4 py-3 font-semibold text-text">Consumo (kWh)</th>
              <th className="sticky top-0 z-10 bg-raised px-4 py-3 font-semibold text-text">Peak (kW)</th>
              <th className="sticky top-0 z-10 bg-raised px-4 py-3 font-semibold text-text">Cargo fijo</th>
              <th className="sticky top-0 z-10 bg-raised px-4 py-3 font-semibold text-text">Total neto</th>
              <th className="sticky top-0 z-10 bg-raised px-4 py-3 font-semibold text-text">IVA</th>
              <th className="sticky top-0 z-10 bg-raised px-4 py-3 font-semibold text-text">Total con IVA</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) =>
              group.rows.map((row, i) => (
                <tr key={row.id} className="border-b border-border hover:bg-raised">
                  {i === 0 ? (
                    <td rowSpan={group.rows.length} className="border-r border-border px-4 py-3 font-medium text-text align-top">
                      {group.centerName}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-muted">{row.year ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{monthLabel(row)}</td>
                  <td className="px-4 py-3 text-text">{row.meterId ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{row.storeType ?? '—'}</td>
                  <td className="px-4 py-3 text-text">{row.storeName ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{row.phase ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatKwh(row.consumptionKwh)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatKw(row.peakKw)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatClp(row.fixedChargeClp)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatClp(row.totalNetClp)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatClp(row.ivaClp)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatClp(row.totalWithIvaClp)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { PAGE_SIZE as BILLING_DETAIL_PAGE_SIZE };

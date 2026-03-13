import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../../components/ui/DataTable';
import type { BillingCenterSummary } from '../../../types';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export interface BillingSummaryPivotRow {
  centerName: string;
  year: number;
  /** Consumo total (kWh) por mes: índice 0 = enero, 11 = diciembre */
  consumptionByMonth: (number | null)[];
  /** Total anual (suma de los 12 meses) */
  totalKwh: number | null;
}

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

/**
 * Agrupa filas por centro y año; reparte consumo por mes y calcula total anual.
 */
function pivotByCenterAndYear(rows: BillingCenterSummary[]): BillingSummaryPivotRow[] {
  const map = new Map<string, BillingSummaryPivotRow>();
  for (const r of rows) {
    const key = `${r.centerName}|${r.year}`;
    let row = map.get(key);
    if (!row) {
      row = {
        centerName: r.centerName,
        year: r.year,
        consumptionByMonth: Array.from({ length: 12 }, () => null),
        totalKwh: null,
      };
      map.set(key, row);
    }
    const monthIdx = (toNum(r.month) ?? 1) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      const val = toNum(r.totalConsumptionKwh);
      row.consumptionByMonth[monthIdx] = val;
    }
  }
  const result = Array.from(map.values());
  for (const row of result) {
    const values = row.consumptionByMonth.filter((v): v is number => v != null && Number.isFinite(v));
    row.totalKwh = values.length > 0 ? values.reduce((a, b) => a + b, 0) : null;
  }
  result.sort((a, b) => a.centerName.localeCompare(b.centerName) || a.year - b.year);
  return result;
}

interface BillingSummaryTableProps {
  data: BillingCenterSummary[];
  isLoading: boolean;
}

/**
 * Tabla de resumen ejecutivo: una fila por centro y año, columnas por mes (consumo kWh) y total.
 */
export function BillingSummaryTable({ data, isLoading }: BillingSummaryTableProps) {
  const pivotData = useMemo(() => pivotByCenterAndYear(data), [data]);

  const columns = useMemo<ColumnDef<BillingSummaryPivotRow, unknown>[]>(() => [
    { accessorKey: 'centerName', header: 'Centro' },
    { accessorKey: 'year', header: 'Año' },
    ...MONTH_NAMES.map((name, i) => ({
      id: `month_${i}`,
      header: name,
      accessorFn: (row: BillingSummaryPivotRow) => row.consumptionByMonth[i],
      cell: ({ getValue }: { getValue: () => unknown }) => formatKwh(getValue()),
    })),
    {
      id: 'total',
      header: 'Total (kWh)',
      accessorFn: (row: BillingSummaryPivotRow) => row.totalKwh,
      cell: ({ getValue }: { getValue: () => unknown }) => formatKwh(getValue()),
    },
  ], []);

  if (isLoading) {
    return (
      <div className="rounded border border-border bg-raised px-4 py-8 text-center text-muted">
        Cargando resumen…
      </div>
    );
  }
  if (!pivotData.length) {
    return (
      <div className="rounded border border-border bg-raised px-4 py-8 text-center text-muted">
        No hay datos de resumen.
      </div>
    );
  }
  return (
    <DataTable
      data={pivotData}
      columns={columns}
      className="min-h-[200px]"
    />
  );
}

import { useState, useRef, useEffect, useMemo } from 'react';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import type { BillingMonthlySummary } from '../../../types';
import type { BillingMetricKey } from './billingMetrics';
import { billingMetrics } from './billingMetrics';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function monthName(iso: string): string {
  const m = new Date(iso).getMonth();
  return MONTH_NAMES[m] ?? iso;
}

type NumKey = keyof { [K in keyof BillingMonthlySummary as BillingMonthlySummary[K] extends number | null ? K : never]: 1 };

function sumN(d: BillingMonthlySummary[], k: NumKey): number | null {
  const vals = d.map((r) => (r as Record<string, unknown>)[k]).filter((v): v is number => v != null);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
}

function maxN(d: BillingMonthlySummary[], k: NumKey): number | null {
  const vals = d.map((r) => (r as Record<string, unknown>)[k]).filter((v): v is number => v != null);
  return vals.length > 0 ? Math.max(...vals) : null;
}

function fmtClp(n: number | null | undefined): string {
  return n != null ? '$' + n.toLocaleString('es-CL', { maximumFractionDigits: 0 }) : '—';
}

function fmtNum(n: number | null | undefined, decimals = 1): string {
  return n != null ? n.toLocaleString('es-CL', { maximumFractionDigits: decimals }) : '—';
}

function MonthFilterDropdown({
  months,
  visibleMonths,
  onToggle,
}: {
  months: string[];
  visibleMonths: Set<string>;
  onToggle: (month: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allSelected = months.length === visibleMonths.size;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 whitespace-nowrap font-medium transition-colors hover:text-text"
      >
        Mes
        <svg className="h-3 w-3 shrink-0 opacity-40" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
        {!allSelected && (
          <span className="ml-0.5 text-[10px] text-blue-600">{visibleMonths.size}</span>
        )}
      </button>

      {open && (
        <ul className="absolute left-0 z-30 mt-1 w-44 overflow-y-auto rounded border border-border bg-white py-1 shadow-lg">
          <li className="border-b border-border/50">
            <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-raised">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {
                  if (allSelected) onToggle(months[0]);
                  else months.forEach((m) => { if (!visibleMonths.has(m)) onToggle(m); });
                }}
                className="h-3.5 w-3.5 rounded border-border accent-blue-600"
              />
              <span className="text-text">Todo</span>
            </label>
          </li>
          {months.map((iso) => {
            const checked = visibleMonths.has(iso);
            return (
              <li key={iso}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-raised">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(iso)}
                    className="h-3.5 w-3.5 rounded border-border accent-blue-600"
                  />
                  <span className={checked ? 'text-text' : 'text-muted'}>{monthName(iso)}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface BillingTableProps {
  data: BillingMonthlySummary[];
  highlightMetric?: BillingMetricKey;
  hoveredMetric?: BillingMetricKey | null;
}

export function BillingTable({ data, highlightMetric, hoveredMetric }: BillingTableProps) {
  const allMonths = data.map((r) => r.month);
  const [visibleMonths, setVisibleMonths] = useState<Set<string>>(() => new Set(allMonths));

  const highlightLabel = highlightMetric ? billingMetrics[highlightMetric].label : null;
  const hoveredLabel = hoveredMetric ? billingMetrics[hoveredMetric].label : null;

  function colBg(label: string): string {
    if (hoveredLabel && label === hoveredLabel) return 'bg-blue-50/60';
    if (label === highlightLabel) return 'bg-blue-50';
    return '';
  }

  function handleToggleMonth(month: string) {
    setVisibleMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        if (next.size > 1) next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  }

  const filtered = data.filter((r) => visibleMonths.has(r.month));

  const columns: Column<BillingMonthlySummary>[] = useMemo(() => [
    {
      label: 'Mes',
      value: (r) => monthName(r.month),
      total: () => 'Total anual',
      align: 'left' as const,
      headerRender: () => (
        <MonthFilterDropdown months={allMonths} visibleMonths={visibleMonths} onToggle={handleToggleMonth} />
      ),
      className: colBg('Mes'),
    },
    { label: 'Consumo (kWh)', value: (r) => fmtNum(r.totalKwh), total: (d) => fmtNum(sumN(d, 'totalKwh')), className: colBg('Consumo (kWh)') },
    { label: 'Energía ($)', value: (r) => fmtClp(r.energiaClp), total: (d) => fmtClp(sumN(d, 'energiaClp')), className: colBg('Energía ($)') },
    { label: 'Dda. máx. (kW)', value: (r) => fmtNum(r.ddaMaxKw), total: (d) => fmtNum(maxN(d, 'ddaMaxKw')), className: colBg('Dda. máx. (kW)') },
    { label: 'Dda. punta (kW)', value: (r) => fmtNum(r.ddaMaxPuntaKw), total: (d) => fmtNum(maxN(d, 'ddaMaxPuntaKw')), className: colBg('Dda. punta (kW)') },
    { label: 'kWh troncal', value: (r) => fmtNum(r.kwhTroncal), total: (d) => fmtNum(sumN(d, 'kwhTroncal')), className: colBg('kWh troncal') },
    { label: 'kWh serv. público', value: (r) => fmtNum(r.kwhServPublico), total: (d) => fmtNum(sumN(d, 'kwhServPublico')), className: colBg('kWh serv. público') },
    { label: 'Cargo fijo ($)', value: (r) => fmtClp(r.cargoFijoClp), total: (d) => fmtClp(sumN(d, 'cargoFijoClp')), className: colBg('Cargo fijo ($)') },
    { label: 'Neto ($)', value: (r) => fmtClp(r.totalNetoClp), total: (d) => fmtClp(sumN(d, 'totalNetoClp')), className: colBg('Neto ($)') },
    { label: 'IVA ($)', value: (r) => fmtClp(r.ivaClp), total: (d) => fmtClp(sumN(d, 'ivaClp')), className: colBg('IVA ($)') },
    { label: 'Exento ($)', value: (r) => fmtClp(r.montoExentoClp), total: (d) => fmtClp(sumN(d, 'montoExentoClp')), className: colBg('Exento ($)') },
    { label: 'Total c/IVA ($)', value: (r) => fmtClp(r.totalConIvaClp), total: (d) => fmtClp(sumN(d, 'totalConIvaClp')), className: colBg('Total c/IVA ($)') },
  ], [allMonths, visibleMonths, highlightLabel, hoveredLabel]);

  return (
    <DataTable
      data={filtered}
      columns={columns}
      footer
      rowKey={(r) => r.month}
    />
  );
}

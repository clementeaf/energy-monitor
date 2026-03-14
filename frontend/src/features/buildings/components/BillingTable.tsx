import { useState, useRef, useEffect } from 'react';
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

function fmtClp(n: number): string {
  return '$' + n.toLocaleString('es-CL', { maximumFractionDigits: 0 });
}

function fmtNum(n: number, decimals = 1): string {
  return n.toLocaleString('es-CL', { maximumFractionDigits: decimals });
}

type Col = {
  label: string;
  value: (r: BillingMonthlySummary) => string;
  total: (data: BillingMonthlySummary[]) => string;
  align?: 'left' | 'right';
};

const columns: Col[] = [
  { label: 'Mes', value: (r) => monthName(r.month), total: () => 'Total anual', align: 'left' },
  { label: 'Consumo (kWh)', value: (r) => fmtNum(r.totalKwh), total: (d) => fmtNum(d.reduce((s, r) => s + r.totalKwh, 0)) },
  { label: 'Energía ($)', value: (r) => fmtClp(r.energiaClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.energiaClp, 0)) },
  { label: 'Dda. máx. (kW)', value: (r) => fmtNum(r.ddaMaxKw), total: (d) => fmtNum(Math.max(...d.map((r) => r.ddaMaxKw))) },
  { label: 'Dda. punta (kW)', value: (r) => fmtNum(r.ddaMaxPuntaKw), total: (d) => fmtNum(Math.max(...d.map((r) => r.ddaMaxPuntaKw))) },
  { label: 'kWh troncal', value: (r) => fmtNum(r.kwhTroncal), total: (d) => fmtNum(d.reduce((s, r) => s + r.kwhTroncal, 0)) },
  { label: 'kWh serv. público', value: (r) => fmtNum(r.kwhServPublico), total: (d) => fmtNum(d.reduce((s, r) => s + r.kwhServPublico, 0)) },
  { label: 'Cargo fijo ($)', value: (r) => fmtClp(r.cargoFijoClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.cargoFijoClp, 0)) },
  { label: 'Neto ($)', value: (r) => fmtClp(r.totalNetoClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.totalNetoClp, 0)) },
  { label: 'IVA ($)', value: (r) => fmtClp(r.ivaClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.ivaClp, 0)) },
  { label: 'Exento ($)', value: (r) => fmtClp(r.montoExentoClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.montoExentoClp, 0)) },
  { label: 'Total c/IVA ($)', value: (r) => fmtClp(r.totalConIvaClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.totalConIvaClp, 0)) },
];

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

  return (
    <div className="max-h-72 overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-border text-xs text-muted">
            {columns.map((col) => (
              <th
                key={col.label}
                className={`whitespace-nowrap py-2 pr-6 font-medium transition-colors ${col.align === 'left' ? 'text-left' : 'text-right'} ${colBg(col.label)} ${colBg(col.label) ? 'text-text' : ''}`}
              >
                {col.label === 'Mes' ? (
                  <MonthFilterDropdown
                    months={allMonths}
                    visibleMonths={visibleMonths}
                    onToggle={handleToggleMonth}
                  />
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.month} className="border-b border-border/50 text-text">
              {columns.map((col) => (
                <td
                  key={col.label}
                  className={`whitespace-nowrap py-2 pr-6 tabular-nums transition-colors ${col.align === 'left' ? '' : 'text-right'} ${colBg(col.label)}`}
                >
                  {col.value(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 z-10 bg-white">
          <tr className="border-t border-border font-medium text-text">
            {columns.map((col) => (
              <td
                key={col.label}
                className={`whitespace-nowrap py-2 pr-6 tabular-nums transition-colors ${col.align === 'left' ? '' : 'text-right'} ${colBg(col.label)}`}
              >
                {col.total(filtered)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

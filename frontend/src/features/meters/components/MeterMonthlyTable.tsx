import type { MeterMonthly } from '../../../types';
import type { MeterMetricKey } from './meterMetrics';
import { meterMetrics } from './meterMetrics';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function monthName(iso: string): string {
  const m = new Date(iso).getMonth();
  return MONTH_NAMES[m] ?? iso;
}

function fmtNum(n: number | null, decimals = 1): string {
  if (n === null) return '—';
  return n.toLocaleString('es-CL', { maximumFractionDigits: decimals });
}

type Col = {
  label: string;
  value: (r: MeterMonthly) => string;
  total: (data: MeterMonthly[]) => string;
  align?: 'left' | 'right';
};

const columns: Col[] = [
  { label: 'Mes', value: (r) => monthName(r.month), total: () => 'Total anual', align: 'left' },
  { label: 'Consumo (kWh)', value: (r) => fmtNum(r.totalKwh), total: (d) => fmtNum(d.reduce((s, r) => s + (r.totalKwh ?? 0), 0)) },
  { label: 'Potencia prom. (kW)', value: (r) => fmtNum(r.avgPowerKw), total: (d) => fmtNum(d.reduce((s, r) => s + (r.avgPowerKw ?? 0), 0) / (d.filter((r) => r.avgPowerKw !== null).length || 1)) },
  { label: 'Potencia peak (kW)', value: (r) => fmtNum(r.peakPowerKw), total: (d) => fmtNum(Math.max(...d.map((r) => r.peakPowerKw ?? 0))) },
  { label: 'Reactiva (kVAr)', value: (r) => fmtNum(r.totalReactiveKvar), total: (d) => fmtNum(d.reduce((s, r) => s + (r.totalReactiveKvar ?? 0), 0)) },
  { label: 'Factor potencia', value: (r) => fmtNum(r.avgPowerFactor, 3), total: (d) => fmtNum(d.reduce((s, r) => s + (r.avgPowerFactor ?? 0), 0) / (d.filter((r) => r.avgPowerFactor !== null).length || 1), 3) },
];

interface MeterMonthlyTableProps {
  data: MeterMonthly[];
  highlightMetric?: MeterMetricKey;
  hoveredMetric?: MeterMetricKey | null;
}

export function MeterMonthlyTable({ data, highlightMetric, hoveredMetric }: MeterMonthlyTableProps) {
  const highlightLabel = highlightMetric ? meterMetrics[highlightMetric].label : null;
  const hoveredLabel = hoveredMetric ? meterMetrics[hoveredMetric].label : null;

  function colBg(label: string): string {
    if (hoveredLabel && label === hoveredLabel) return 'bg-blue-50/60';
    if (label === highlightLabel) return 'bg-blue-50';
    return '';
  }

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
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
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
                {col.total(data)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

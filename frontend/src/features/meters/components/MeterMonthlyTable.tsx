import { useMemo } from 'react';
import { DataTable, type Column } from '../../../components/ui/DataTable';
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

interface MeterMonthlyTableProps {
  data: MeterMonthly[];
  highlightMetric?: MeterMetricKey;
  hoveredMetric?: MeterMetricKey | null;
  onMonthClick?: (month: string) => void;
}

export function MeterMonthlyTable({ data, highlightMetric, hoveredMetric, onMonthClick }: MeterMonthlyTableProps) {
  const highlightLabel = highlightMetric ? meterMetrics[highlightMetric].label : null;
  const hoveredLabel = hoveredMetric ? meterMetrics[hoveredMetric].label : null;

  function colBg(label: string): string {
    if (hoveredLabel && label === hoveredLabel) return 'bg-blue-50/60';
    if (label === highlightLabel) return 'bg-blue-50';
    return '';
  }

  const columns: Column<MeterMonthly>[] = useMemo(() => [
    { label: 'Mes', value: (r) => monthName(r.month), total: () => 'Total anual', align: 'left' as const, className: colBg('Mes') },
    { label: 'Consumo (kWh)', value: (r) => fmtNum(r.totalKwh), total: (d) => fmtNum(d.reduce((s, r) => s + (r.totalKwh ?? 0), 0)), className: colBg('Consumo (kWh)') },
    { label: 'Potencia prom. (kW)', value: (r) => fmtNum(r.avgPowerKw), total: (d) => fmtNum(d.reduce((s, r) => s + (r.avgPowerKw ?? 0), 0) / (d.filter((r) => r.avgPowerKw !== null).length || 1)), className: colBg('Potencia prom. (kW)') },
    { label: 'Potencia peak (kW)', value: (r) => fmtNum(r.peakPowerKw), total: (d) => fmtNum(Math.max(...d.map((r) => r.peakPowerKw ?? 0))), className: colBg('Potencia peak (kW)') },
    { label: 'Reactiva (kVAr)', value: (r) => fmtNum(r.totalReactiveKvar), total: (d) => fmtNum(d.reduce((s, r) => s + (r.totalReactiveKvar ?? 0), 0)), className: colBg('Reactiva (kVAr)') },
    { label: 'Factor potencia', value: (r) => fmtNum(r.avgPowerFactor, 3), total: (d) => fmtNum(d.reduce((s, r) => s + (r.avgPowerFactor ?? 0), 0) / (d.filter((r) => r.avgPowerFactor !== null).length || 1), 3), className: colBg('Factor potencia') },
  ], [highlightLabel, hoveredLabel]);

  return (
    <DataTable
      data={data}
      columns={columns}
      footer
      rowKey={(r) => r.month}
      onRowClick={onMonthClick ? (r) => onMonthClick(r.month) : undefined}
    />
  );
}

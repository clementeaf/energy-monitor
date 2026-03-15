import { useMemo } from 'react';
import { Link } from 'react-router';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { fmtNum, monthName } from '../../../lib/formatters';
import { avgNonNull } from '../../../lib/aggregations';
import type { Alert, MeterMonthly } from '../../../types';
import type { MeterMetricKey } from './meterMetrics';
import { meterMetrics } from './meterMetrics';

interface MeterMonthlyTableProps {
  data: MeterMonthly[];
  alerts?: Alert[];
  highlightMetric?: MeterMetricKey;
  hoveredMetric?: MeterMetricKey | null;
  onMonthClick?: (month: string) => void;
}

export function MeterMonthlyTable({ data, alerts = [], highlightMetric, hoveredMetric, onMonthClick }: MeterMonthlyTableProps) {
  const highlightLabel = highlightMetric ? meterMetrics[highlightMetric].label : null;
  const hoveredLabel = hoveredMetric ? meterMetrics[hoveredMetric].label : null;

  // Alertas agrupadas por mes (YYYY-MM)
  const alertsByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of alerts) {
      const ym = a.timestamp.slice(0, 7); // YYYY-MM
      map.set(ym, (map.get(ym) ?? 0) + 1);
    }
    return map;
  }, [alerts]);

  function colBg(label: string): string {
    if (hoveredLabel && label === hoveredLabel) return 'bg-blue-50/60';
    if (label === highlightLabel) return 'bg-blue-50';
    return '';
  }

  const columns: Column<MeterMonthly>[] = useMemo(() => [
    { label: 'Mes', value: (r) => monthName(r.month), total: () => 'Total anual', align: 'left' as const, className: colBg('Mes') },
    {
      label: 'Incidencias',
      value: (r) => {
        const c = alertsByMonth.get(r.month.slice(0, 7)) ?? 0;
        if (c === 0) return '—';
        const ym = r.month.slice(0, 7);
        const lastDay = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate();
        return <Link to={`/alerts?meter_id=${r.meterId}&date_from=${ym}-01&date_to=${ym}-${lastDay}`} className="text-red-500 underline hover:text-red-400" onClick={(e) => e.stopPropagation()}>{c}</Link>;
      },
      total: (d) => String(d.reduce((s, r) => s + (alertsByMonth.get(r.month.slice(0, 7)) ?? 0), 0)),
      className: colBg('Incidencias'),
    },
    { label: 'Consumo (kWh)', value: (r) => fmtNum(r.totalKwh), total: (d) => fmtNum(d.reduce((s, r) => s + (r.totalKwh ?? 0), 0)), className: colBg('Consumo (kWh)') },
    { label: 'Potencia prom. (kW)', value: (r) => fmtNum(r.avgPowerKw), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgPowerKw))), className: colBg('Potencia prom. (kW)') },
    { label: 'Potencia peak (kW)', value: (r) => fmtNum(r.peakPowerKw), total: (d) => fmtNum(Math.max(...d.map((r) => r.peakPowerKw ?? 0))), className: colBg('Potencia peak (kW)') },
    { label: 'Reactiva (kVAr)', value: (r) => fmtNum(r.totalReactiveKvar), total: (d) => fmtNum(d.reduce((s, r) => s + (r.totalReactiveKvar ?? 0), 0)), className: colBg('Reactiva (kVAr)') },
    { label: 'Factor potencia', value: (r) => fmtNum(r.avgPowerFactor, 3), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgPowerFactor)), 3), className: colBg('Factor potencia') },
  ], [highlightLabel, hoveredLabel, alertsByMonth]);

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

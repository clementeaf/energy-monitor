import { useRef, useEffect, useState, useMemo } from 'react';
import Highcharts from 'highcharts';
import { PillDropdownMulti } from '../../../components/ui/PillDropdownMulti';
import { fmtClp, monthName } from '../../../lib/formatters';
import { SHORT_BUILDING_NAMES } from '../../../lib/constants';
import { CHART_COLORS, LIGHT_PLOT_OPTIONS, LIGHT_TOOLTIP_STYLE } from '../../../lib/chartConfig';
import type { DashboardBuildingMonth } from '../../../types';

const SERIES_COLORS = [CHART_COLORS.blue, CHART_COLORS.coral, '#2D9F5D', '#F5A623', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'];

interface Props {
  data: DashboardBuildingMonth[] | undefined;
}

export function ComparativaChart({ data }: Props) {
  const consumoRef = useRef<HTMLDivElement>(null);
  const ingresoRef = useRef<HTMLDivElement>(null);
  const consumoChart = useRef<Highcharts.Chart | null>(null);
  const ingresoChart = useRef<Highcharts.Chart | null>(null);

  const buildings = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((r) => r.buildingName))].sort();
  }, [data]);

  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);

  useEffect(() => {
    if (buildings.length > 0 && selectedBuildings.length === 0) setSelectedBuildings([buildings[0]]);
  }, [buildings]);

  const availableMonths = useMemo(() => {
    if (!data || selectedBuildings.length === 0) return [];
    const monthSet = new Set<string>();
    for (const r of data) {
      if (selectedBuildings.includes(r.buildingName) && new Date(r.month).getFullYear() !== 2026) {
        monthSet.add(r.month);
      }
    }
    return [...monthSet].sort();
  }, [data, selectedBuildings]);

  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  useEffect(() => {
    if (availableMonths.length > 0) {
      setSelectedMonths((prev) => {
        const valid = prev.filter((m) => availableMonths.includes(m));
        return valid.length > 0 ? valid : availableMonths.slice(-3);
      });
    }
  }, [availableMonths]);

  function toggleMonth(m: string) {
    setSelectedMonths((prev) => {
      if (prev.includes(m)) return prev.filter((x) => x !== m);
      if (prev.length >= 3) return prev;
      return [...prev, m].sort();
    });
  }

  // Build series: one per building, categories = months
  const chartSeries = useMemo(() => {
    if (!data || selectedBuildings.length === 0 || selectedMonths.length === 0) return null;

    const lookup = new Map<string, DashboardBuildingMonth>();
    for (const r of data) {
      lookup.set(`${r.buildingName}|${r.month}`, r);
    }

    return selectedBuildings.map((bldg, i) => {
      const consumoData = selectedMonths.map((m) => {
        const row = lookup.get(`${bldg}|${m}`);
        return Math.round((row?.totalKwh ?? 0) / 1000);
      });
      const ingresoData = selectedMonths.map((m) => {
        const row = lookup.get(`${bldg}|${m}`);
        return row?.totalConIvaClp ?? 0;
      });
      return {
        name: SHORT_BUILDING_NAMES[bldg] ?? bldg,
        color: SERIES_COLORS[i % SERIES_COLORS.length],
        consumoData,
        ingresoData,
      };
    });
  }, [data, selectedBuildings, selectedMonths]);

  useEffect(() => {
    if (!chartSeries || chartSeries.length === 0) return;

    const categories = selectedMonths.map((m) => monthName(m));

    if (consumoRef.current) {
      consumoChart.current?.destroy();
      consumoChart.current = Highcharts.chart({
        chart: { type: 'column', backgroundColor: '#ffffff', borderRadius: 12, renderTo: consumoRef.current, height: 250 },
        title: { text: 'Consumo (mWh)', align: 'left', style: { fontSize: '13px', fontWeight: 'bold', color: '#1B1464' } },
        xAxis: { categories, labels: { style: { fontSize: '12px', color: '#6B7280' } }, lineColor: '#E5E7EB' },
        yAxis: {
          title: { text: undefined },
          tickAmount: 5,
          labels: { formatter() { return (this.value as number).toLocaleString('es-CL'); }, style: { color: '#6B7280', fontSize: '11px' } },
          gridLineColor: '#F3F4F6',
        },
        tooltip: {
          shared: true, useHTML: true, ...LIGHT_TOOLTIP_STYLE,
          formatter() {
            let html = `<b style="color:#1B1464">${this.x}</b><br/>`;
            for (const p of this.points!) {
              html += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${(p.y ?? 0).toLocaleString('es-CL')} mWh</b><br/>`;
            }
            return html;
          },
        },
        plotOptions: LIGHT_PLOT_OPTIONS,
        legend: { itemStyle: { color: '#1F2937', fontSize: '12px' } },
        series: chartSeries.map((s) => ({ type: 'column' as const, name: s.name, data: s.consumoData, color: s.color })),
        credits: { enabled: false },
      });
    }

    if (ingresoRef.current) {
      ingresoChart.current?.destroy();
      ingresoChart.current = Highcharts.chart({
        chart: { type: 'column', backgroundColor: '#ffffff', borderRadius: 12, renderTo: ingresoRef.current, height: 250 },
        title: { text: 'Ingreso (CLP)', align: 'left', style: { fontSize: '13px', fontWeight: 'bold', color: '#1B1464' } },
        xAxis: { categories, labels: { style: { fontSize: '12px', color: '#6B7280' } }, lineColor: '#E5E7EB' },
        yAxis: {
          title: { text: undefined },
          tickAmount: 5,
          labels: { formatter() { return `$${((this.value as number) / 1_000_000).toFixed(1)}M`; }, style: { color: '#6B7280', fontSize: '11px' } },
          gridLineColor: '#F3F4F6',
        },
        tooltip: {
          shared: true, useHTML: true, ...LIGHT_TOOLTIP_STYLE,
          formatter() {
            let html = `<b style="color:#1B1464">${this.x}</b><br/>`;
            for (const p of this.points!) {
              html += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${fmtClp(p.y ?? 0)}</b><br/>`;
            }
            return html;
          },
        },
        plotOptions: LIGHT_PLOT_OPTIONS,
        legend: { itemStyle: { color: '#1F2937', fontSize: '12px' } },
        series: chartSeries.map((s) => ({ type: 'column' as const, name: s.name, data: s.ingresoData, color: s.color })),
        credits: { enabled: false },
      });
    }

    return () => {
      consumoChart.current?.destroy();
      consumoChart.current = null;
      ingresoChart.current?.destroy();
      ingresoChart.current = null;
    };
  }, [chartSeries, selectedMonths]);

  const buildingItems = buildings.map((b) => ({ value: b, label: SHORT_BUILDING_NAMES[b] ?? b }));

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Selector edificios (multi con checkbox + búsqueda) */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-semibold text-pa-navy">Edificios:</span>
        <PillDropdownMulti
          items={buildingItems}
          selected={selectedBuildings}
          onChange={setSelectedBuildings}
          placeholder="Seleccionar edificios"
          listWidth="w-72"
          align="left"
        />
      </div>

      {/* Selector meses (max 3) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[13px] font-semibold text-pa-navy mr-1">Meses (máx. 3):</span>
        {availableMonths.map((m) => {
          const active = selectedMonths.includes(m);
          const disabled = !active && selectedMonths.length >= 3;
          return (
            <button
              key={m}
              onClick={() => toggleMonth(m)}
              disabled={disabled}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-pa-navy text-white'
                  : disabled
                    ? 'bg-gray-100 text-pa-text-muted/40 cursor-not-allowed'
                    : 'bg-gray-100 text-pa-text-muted hover:bg-gray-200'
              }`}
            >
              {monthName(m)}
            </button>
          );
        })}
      </div>

      {/* Charts */}
      {chartSeries && chartSeries.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <div ref={consumoRef} />
          <div ref={ingresoRef} />
        </div>
      ) : (
        <p className="text-sm text-pa-text-muted">Selecciona al menos un edificio y un mes.</p>
      )}
    </div>
  );
}

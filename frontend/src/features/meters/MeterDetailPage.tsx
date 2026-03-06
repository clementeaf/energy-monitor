import { useCallback, useState } from 'react';
import { useParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { MeterDetailSkeleton, ChartSkeleton } from '../../components/ui/Skeleton';
import { StockChart } from '../../components/ui/StockChart';
import { useMeter, useMeterReadings } from '../../hooks/queries/useMeters';
import { UptimeBadges } from './components/UptimeBadges';
import { DowntimeEventsTable } from './components/DowntimeEventsTable';
import type { Reading } from '../../types';

type Resolution = 'raw' | '15min' | 'hourly' | 'daily';

/** Pick resolution based on visible range duration */
function pickResolution(rangeMs: number): Resolution {
  const hours = rangeMs / 3_600_000;
  if (hours <= 36) return '15min';
  if (hours <= 7 * 24) return 'hourly';
  return 'daily';
}

/** Helper: map readings to [timestamp, value] pairs, filtering nulls */
function ts(readings: Reading[] | undefined, key: keyof Reading): [number, number][] {
  if (!readings) return [];
  return readings
    .filter((r) => r[key] != null)
    .map((r) => [new Date(r.timestamp).getTime(), r[key] as number]);
}

const smallChart: Highcharts.Options['chart'] = { height: 300 };
const tooltipFmt: Highcharts.Options['tooltip'] = { xDateFormat: '%d/%m/%Y %H:%M' };

export function MeterDetailPage() {
  const { meterId } = useParams<{ meterId: string }>();
  const { data: meter, isLoading } = useMeter(meterId!);
  const [resolution, setResolution] = useState<Resolution>('hourly');

  const handleRangeChange = useCallback((min: number, max: number) => {
    setResolution(pickResolution(max - min));
  }, []);

  const { data: readings, isLoading: loadingReadings } = useMeterReadings(meterId!, resolution);

  if (isLoading) return <MeterDetailSkeleton />;
  if (!meter) return <p className="text-subtle">Medidor no encontrado</p>;

  const is3P = meter.phaseType === '3P';

  // 1. Potencia Activa + Reactiva
  const powerChart: Highcharts.Options = {
    chart: smallChart,
    title: { text: 'Potencia' },
    yAxis: [
      { title: { text: 'kW' }, opposite: false },
      { title: { text: 'kVAR' }, opposite: true },
    ],
    series: [
      { name: 'Activa (kW)', type: 'line', data: ts(readings, 'powerKw'), yAxis: 0 },
      { name: 'Reactiva (kVAR)', type: 'line', data: ts(readings, 'reactivePowerKvar'), yAxis: 1 },
    ],
    tooltip: tooltipFmt,
  };

  // 2. Voltaje (L1/L2/L3)
  const voltageChart: Highcharts.Options = {
    chart: smallChart,
    title: { text: 'Voltaje (V)' },
    yAxis: { title: { text: 'V' } },
    series: [
      { name: 'L1', type: 'line', data: ts(readings, 'voltageL1') },
      ...(is3P ? [
        { name: 'L2', type: 'line' as const, data: ts(readings, 'voltageL2') },
        { name: 'L3', type: 'line' as const, data: ts(readings, 'voltageL3') },
      ] : []),
    ],
    tooltip: tooltipFmt,
  };

  // 3. Corriente (L1/L2/L3)
  const currentChart: Highcharts.Options = {
    chart: smallChart,
    title: { text: 'Corriente (A)' },
    yAxis: { title: { text: 'A' } },
    series: [
      { name: 'L1', type: 'line', data: ts(readings, 'currentL1') },
      ...(is3P ? [
        { name: 'L2', type: 'line' as const, data: ts(readings, 'currentL2') },
        { name: 'L3', type: 'line' as const, data: ts(readings, 'currentL3') },
      ] : []),
    ],
    tooltip: tooltipFmt,
  };

  // 4. Factor de Potencia + Frecuencia
  const pfFreqChart: Highcharts.Options = {
    chart: smallChart,
    title: { text: 'Factor de Potencia & Frecuencia' },
    yAxis: [
      { title: { text: 'PF' }, min: 0, max: 1, opposite: false },
      { title: { text: 'Hz' }, opposite: true },
    ],
    series: [
      { name: 'Factor de Potencia', type: 'line', data: ts(readings, 'powerFactor'), yAxis: 0 },
      { name: 'Frecuencia (Hz)', type: 'line', data: ts(readings, 'frequencyHz'), yAxis: 1 },
    ],
    tooltip: tooltipFmt,
  };

  // 5. Energía Acumulada
  const energyChart: Highcharts.Options = {
    chart: smallChart,
    title: { text: 'Energía Acumulada (kWh)' },
    yAxis: { title: { text: 'kWh' } },
    series: [
      { name: 'Energía Total', type: 'area', data: ts(readings, 'energyKwhTotal'), fillOpacity: 0.15 },
    ],
    tooltip: tooltipFmt,
  };

  // 6. Calidad Eléctrica (THD + Desbalance) — solo 3P
  const qualityChart: Highcharts.Options = {
    chart: smallChart,
    title: { text: 'Calidad Eléctrica' },
    yAxis: { title: { text: '%' } },
    series: [
      { name: 'THD Voltaje (%)', type: 'line', data: ts(readings, 'thdVoltagePct') },
      { name: 'THD Corriente (%)', type: 'line', data: ts(readings, 'thdCurrentPct') },
      { name: 'Desbalance Fases (%)', type: 'line', data: ts(readings, 'phaseImbalancePct') },
    ],
    tooltip: tooltipFmt,
  };

  const skeletonCount = is3P ? 6 : 4;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title={`Medidor ${meter.id}`}
          showBack
          breadcrumbs={[
            { label: 'Edificios', to: '/' },
            { label: meter.buildingId, to: `/buildings/${meter.buildingId}` },
            { label: meter.id },
          ]}
        />
        <div className="mb-3 flex flex-wrap gap-3 text-sm text-muted">
          <span>{meter.model}</span>
          <span>&middot;</span>
          <span>{meter.phaseType}</span>
          <span>&middot;</span>
          <span>Bus: {meter.busId}</span>
          <span>&middot;</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              meter.status === 'online'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {meter.status}
          </span>
        </div>
        <UptimeBadges meterId={meter.id} />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {loadingReadings ? (
          Array.from({ length: skeletonCount }).map((_, i) => <ChartSkeleton key={i} />)
        ) : (
          <>
            <StockChart options={powerChart} onRangeChange={handleRangeChange} />
            <StockChart options={voltageChart} />
            <StockChart options={currentChart} />
            <StockChart options={pfFreqChart} />
            <StockChart options={energyChart} />
            {is3P && <StockChart options={qualityChart} />}
          </>
        )}
        <DowntimeEventsTable meterId={meter.id} />
      </div>
    </div>
  );
}

import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { MeterDetailSkeleton, ChartSkeleton } from '../../components/ui/Skeleton';
import { StockChart } from '../../components/ui/StockChart';
import { useMeter, useMeterReadings, useMeterAlarmEvents } from '../../hooks/queries/useMeters';
import { UptimeBadges } from './components/UptimeBadges';
import { AlarmSummaryBadges } from './components/AlarmSummaryBadges';
import { DowntimeEventsTable } from './components/DowntimeEventsTable';
import { AlarmEventsTable } from './components/AlarmEventsTable';
import type { Reading, AlarmEvent } from '../../types';

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

const ALARM_LABELS: Record<string, string> = {
  MODBUS_CRC_ERROR: 'CRC', BREAKER_OPEN: 'BRK', HIGH_THD: 'THD',
  PHASE_IMBALANCE: 'IMB', UNDERVOLTAGE: 'UV', OVERVOLTAGE: 'OV',
  LOW_POWER_FACTOR: 'PF', HIGH_DEMAND: 'DEM',
};

/** Build Highcharts flags series from alarm events filtered by type */
function alarmFlags(
  events: AlarmEvent[] | undefined,
  types: string[],
  onSeries: string,
): Highcharts.SeriesOptionsType | null {
  if (!events) return null;
  const filtered = events.filter((e) => types.includes(e.alarm));
  if (filtered.length === 0) return null;
  return {
    type: 'flags' as const,
    name: 'Alarmas',
    onSeries,
    shape: 'flag',
    color: '#ef4444',
    fillColor: 'rgba(239,68,68,0.25)',
    style: { color: '#ef4444', fontSize: '9px' },
    data: filtered.map((e) => ({
      x: new Date(e.timestamp).getTime(),
      title: ALARM_LABELS[e.alarm] ?? '!',
      text: `${ALARM_LABELS[e.alarm] ?? e.alarm} — ${new Date(e.timestamp).toLocaleString('es-CL')}`,
    })),
  };
}

export function MeterDetailPage() {
  const { meterId } = useParams<{ meterId: string }>();
  const { data: meter, isLoading } = useMeter(meterId!);
  const [resolution, setResolution] = useState<Resolution>('hourly');

  const handleRangeChange = useCallback((min: number, max: number) => {
    setResolution(pickResolution(max - min));
  }, []);

  const { data: readings, isLoading: loadingReadings, isFetching: fetchingReadings } = useMeterReadings(meterId!, resolution);

  const alarmRange = useMemo(() => {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return { from, to };
  }, []);
  const { data: alarmEvents } = useMeterAlarmEvents(meterId!, alarmRange.from, alarmRange.to);

  if (isLoading) return <MeterDetailSkeleton />;
  if (!meter) return <p className="text-subtle">Medidor no encontrado</p>;

  const is3P = meter.phaseType === '3P';

  // Build alarm flag series per chart
  const powerFlags = alarmFlags(alarmEvents, ['MODBUS_CRC_ERROR', 'HIGH_DEMAND', 'BREAKER_OPEN'], 'powerKw');
  const voltageFlags = alarmFlags(alarmEvents, ['UNDERVOLTAGE', 'OVERVOLTAGE'], 'voltageL1');
  const pfFlags = alarmFlags(alarmEvents, ['LOW_POWER_FACTOR'], 'pf');
  const qualityFlags = alarmFlags(alarmEvents, ['HIGH_THD', 'PHASE_IMBALANCE'], 'thdV');

  // 1. Potencia Activa + Reactiva
  const powerChart: Highcharts.Options = {
    chart: smallChart,
    title: { text: 'Potencia' },
    yAxis: [
      { title: { text: 'kW' }, opposite: false },
      { title: { text: 'kVAR' }, opposite: true },
    ],
    series: [
      { name: 'Activa (kW)', type: 'line', id: 'powerKw', data: ts(readings, 'powerKw'), yAxis: 0 },
      { name: 'Reactiva (kVAR)', type: 'line', data: ts(readings, 'reactivePowerKvar'), yAxis: 1 },
      ...(powerFlags ? [powerFlags] : []),
    ],
    tooltip: tooltipFmt,
  };

  // 2. Voltaje (L1/L2/L3)
  const voltageChart: Highcharts.Options = {
    chart: smallChart,
    title: { text: 'Voltaje Fase (V)' },
    yAxis: { title: { text: 'V' } },
    series: [
      { name: 'L1', type: 'line', id: 'voltageL1', data: ts(readings, 'voltageL1') },
      ...(is3P ? [
        { name: 'L2', type: 'line' as const, data: ts(readings, 'voltageL2') },
        { name: 'L3', type: 'line' as const, data: ts(readings, 'voltageL3') },
      ] : []),
      ...(voltageFlags ? [voltageFlags] : []),
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
      { name: 'Factor de Potencia', type: 'line', id: 'pf', data: ts(readings, 'powerFactor'), yAxis: 0 },
      { name: 'Frecuencia (Hz)', type: 'line', data: ts(readings, 'frequencyHz'), yAxis: 1 },
      ...(pfFlags ? [pfFlags] : []),
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
      { name: 'THD Voltaje Fase (%)', type: 'line', id: 'thdV', data: ts(readings, 'thdVoltagePct') },
      { name: 'THD Corriente (%)', type: 'line', data: ts(readings, 'thdCurrentPct') },
      { name: 'Desbalance Fases (%)', type: 'line', data: ts(readings, 'phaseImbalancePct') },
      ...(qualityFlags ? [qualityFlags] : []),
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
        <AlarmSummaryBadges meterId={meter.id} />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {loadingReadings ? (
          Array.from({ length: skeletonCount }).map((_, i) => <ChartSkeleton key={i} />)
        ) : (
          <>
            <StockChart options={powerChart} loading={fetchingReadings} onRangeChange={handleRangeChange} />
            <StockChart options={voltageChart} loading={fetchingReadings} />
            <StockChart options={currentChart} loading={fetchingReadings} />
            <StockChart options={pfFreqChart} loading={fetchingReadings} />
            <StockChart options={energyChart} loading={fetchingReadings} />
            {is3P && <StockChart options={qualityChart} loading={fetchingReadings} />}
          </>
        )}
        <DowntimeEventsTable meterId={meter.id} />
        <AlarmEventsTable meterId={meter.id} />
      </div>
    </div>
  );
}

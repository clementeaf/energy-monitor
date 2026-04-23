import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { Chart } from '../../../components/charts/Chart';
import { DataWidget } from '../../../components/ui/DataWidget';
import { useQueryState } from '../../../hooks/useQueryState';
import type { ReadingResolution } from '../../../types/reading';

// Normative thresholds (Chilean NCh / IEEE 519)
const THRESHOLDS = {
  thdVoltage: 8,     // % max THD voltage
  thdCurrent: 20,    // % max THD current
  powerFactor: 0.93, // min PF
  phaseImbalance: 3, // % max imbalance
};

export function QualityPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const buildingsQuery = useBuildingsQuery();
  const building = buildingsQuery.data?.find((b) => b.id === siteId);
  const metersQuery = useMetersQuery(siteId);
  const meters = metersQuery.data ?? [];

  const [selectedMeterId, setSelectedMeterId] = useState<string | null>(null);
  const meterId = selectedMeterId ?? meters[0]?.id ?? null;

  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, [now]);

  const [range] = useState({ from: defaultFrom, to: now.toISOString(), resolution: '1h' as ReadingResolution });

  const readingsQuery = useReadingsQuery(
    { meterId: meterId ?? '', from: range.from, to: range.to, resolution: range.resolution },
    !!meterId,
  );

  const readingsQs = useQueryState(readingsQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const qualityAlertsQuery = useAlertsQuery({ status: 'active', buildingId: siteId });
  const qualityAlerts = (qualityAlertsQuery.data ?? []).filter((a) =>
    ['HIGH_THD', 'LOW_POWER_FACTOR', 'PHASE_IMBALANCE', 'VOLTAGE_OUT_OF_RANGE'].includes(a.alertTypeCode),
  );

  const readings = readingsQuery.data ?? [];

  // Chart data builders
  const thdVoltageData = useMemo(() =>
    readings.map((r) => [new Date(r.timestamp).getTime(), r.thd_voltage_pct ? Number(r.thd_voltage_pct) : null]),
  [readings]);

  const thdCurrentData = useMemo(() =>
    readings.map((r) => [new Date(r.timestamp).getTime(), r.thd_current_pct ? Number(r.thd_current_pct) : null]),
  [readings]);

  const pfData = useMemo(() =>
    readings.map((r) => [new Date(r.timestamp).getTime(), r.power_factor ? Number(r.power_factor) : null]),
  [readings]);

  const imbalanceData = useMemo(() =>
    readings.map((r) => [new Date(r.timestamp).getTime(), r.phase_imbalance_pct ? Number(r.phase_imbalance_pct) : null]),
  [readings]);

  // Current averages for indicator cards
  const avgThd = readings.length > 0
    ? readings.reduce((s, r) => s + Number(r.thd_voltage_pct || 0), 0) / readings.length
    : null;
  const avgPf = readings.length > 0
    ? readings.reduce((s, r) => s + Number(r.power_factor || 0), 0) / readings.length
    : null;
  const avgImbalance = readings.length > 0
    ? readings.reduce((s, r) => s + Number(r.phase_imbalance_pct || 0), 0) / readings.length
    : null;

  const meterName = meters.find((m) => m.id === meterId)?.name ?? 'Medidor';

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link to="/monitoring/realtime" className="hover:text-gray-700">Monitoreo</Link>
        <span>/</span>
        <Link to={`/monitoring/drilldown/${siteId}`} className="hover:text-gray-700">{building?.name ?? 'Sitio'}</Link>
        <span>/</span>
        <span className="text-gray-900">Calidad Electrica</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          Calidad Electrica — {building?.name ?? 'Sitio'}
        </h1>
        {meters.length > 0 && (
          <select
            value={meterId ?? ''}
            onChange={(e) => setSelectedMeterId(e.target.value || null)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            {meters.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Threshold indicators */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ThresholdCard
          label="THD Voltaje"
          value={avgThd != null ? `${avgThd.toFixed(1)}%` : '—'}
          threshold={`< ${THRESHOLDS.thdVoltage}%`}
          ok={avgThd != null && avgThd < THRESHOLDS.thdVoltage}
        />
        <ThresholdCard
          label="Factor Potencia"
          value={avgPf != null ? avgPf.toFixed(3) : '—'}
          threshold={`> ${THRESHOLDS.powerFactor}`}
          ok={avgPf != null && avgPf > THRESHOLDS.powerFactor}
        />
        <ThresholdCard
          label="Desequilibrio"
          value={avgImbalance != null ? `${avgImbalance.toFixed(1)}%` : '—'}
          threshold={`< ${THRESHOLDS.phaseImbalance}%`}
          ok={avgImbalance != null && avgImbalance < THRESHOLDS.phaseImbalance}
        />
        <ThresholdCard
          label="Alertas calidad"
          value={String(qualityAlerts.length)}
          threshold="0 activas"
          ok={qualityAlerts.length === 0}
        />
      </div>

      <DataWidget
        phase={readingsQs.phase}
        error={readingsQs.error}
        onRetry={() => { readingsQuery.refetch(); }}
        emptyTitle="Sin datos de calidad"
        emptyDescription="No hay lecturas de calidad electrica para este medidor."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title={`THD Voltaje — ${meterName}`}>
            <Chart options={{
              title: { text: '' },
              yAxis: {
                title: { text: 'THD (%)' },
                plotLines: [{
                  value: THRESHOLDS.thdVoltage,
                  color: '#ef4444',
                  width: 1,
                  dashStyle: 'Dash' as Highcharts.DashStyleValue,
                  label: { text: `Limite: ${THRESHOLDS.thdVoltage}%`, style: { color: '#ef4444', fontSize: '9px' } },
                }],
              },
              xAxis: { type: 'datetime' },
              series: [{ type: 'line', name: 'THD Voltaje (%)', data: thdVoltageData }],
            }} />
          </ChartCard>

          <ChartCard title={`THD Corriente — ${meterName}`}>
            <Chart options={{
              title: { text: '' },
              yAxis: {
                title: { text: 'THD (%)' },
                plotLines: [{
                  value: THRESHOLDS.thdCurrent,
                  color: '#ef4444',
                  width: 1,
                  dashStyle: 'Dash' as Highcharts.DashStyleValue,
                  label: { text: `Limite: ${THRESHOLDS.thdCurrent}%`, style: { color: '#ef4444', fontSize: '9px' } },
                }],
              },
              xAxis: { type: 'datetime' },
              series: [{ type: 'line', name: 'THD Corriente (%)', data: thdCurrentData }],
            }} />
          </ChartCard>

          <ChartCard title={`Factor de Potencia — ${meterName}`}>
            <Chart options={{
              title: { text: '' },
              yAxis: {
                title: { text: 'FP' },
                min: 0,
                max: 1,
                plotLines: [{
                  value: THRESHOLDS.powerFactor,
                  color: '#22c55e',
                  width: 1,
                  dashStyle: 'Dash' as Highcharts.DashStyleValue,
                  label: { text: `Min: ${THRESHOLDS.powerFactor}`, style: { color: '#22c55e', fontSize: '9px' } },
                }],
              },
              xAxis: { type: 'datetime' },
              series: [{ type: 'area', name: 'Factor Potencia', data: pfData }],
            }} />
          </ChartCard>

          <ChartCard title={`Desequilibrio de Fases — ${meterName}`}>
            <Chart options={{
              title: { text: '' },
              yAxis: {
                title: { text: 'Desequilibrio (%)' },
                min: 0,
                plotLines: [{
                  value: THRESHOLDS.phaseImbalance,
                  color: '#ef4444',
                  width: 1,
                  dashStyle: 'Dash' as Highcharts.DashStyleValue,
                  label: { text: `Limite: ${THRESHOLDS.phaseImbalance}%`, style: { color: '#ef4444', fontSize: '9px' } },
                }],
              },
              xAxis: { type: 'datetime' },
              series: [{ type: 'line', name: 'Desequilibrio (%)', data: imbalanceData }],
            }} />
          </ChartCard>
        </div>
      </DataWidget>

      {/* Active quality alerts */}
      {qualityAlerts.length > 0 && (
        <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
          <h2 className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
            Alertas de Calidad Activas
          </h2>
          <ul className="divide-y divide-gray-200">
            {qualityAlerts.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <SeverityDot severity={a.severity} />
                  <span>{a.message}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(a.createdAt).toLocaleString('es-CL')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ThresholdCard({ label, value, threshold, ok }: {
  label: string; value: string; threshold: string; ok: boolean;
}) {
  return (
    <div className={`rounded-lg p-4 shadow-sm ring-1 ${ok ? 'bg-white ring-gray-200' : 'bg-red-50 ring-red-200'}`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${ok ? 'text-gray-900' : 'text-red-600'}`}>{value}</p>
      <p className="text-xs text-gray-400">Umbral: {threshold}</p>
    </div>
  );
}

function ChartCard({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-medium text-gray-700">{title}</h3>
      {children}
    </div>
  );
}

function SeverityDot({ severity }: Readonly<{ severity: string }>) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };
  return <span className={`inline-block size-2 rounded-full ${colors[severity] ?? 'bg-gray-400'}`} />;
}

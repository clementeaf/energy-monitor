import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Card } from '../../../components/ui/Card';
import { MonthlyChart } from '../../../components/charts/MonthlyChart';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useMeterQuery } from '../../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { fmtNum, MONTH_NAMES_SHORT } from '../../../lib/formatters';

/* ── Metric definitions ── */

interface MetricMeta {
  label: string;
  unit: string;
  field: 'energy_delta_kwh' | 'avg_power_kw' | 'max_power_kw' | 'avg_power_factor' | 'avg_voltage_l1';
  decimals: number;
}

const METRICS: MetricMeta[] = [
  { label: 'Consumo', unit: 'kWh', field: 'energy_delta_kwh', decimals: 1 },
  { label: 'Potencia prom.', unit: 'kW', field: 'avg_power_kw', decimals: 2 },
  { label: 'Potencia peak', unit: 'kW', field: 'max_power_kw', decimals: 2 },
  { label: 'Factor potencia', unit: '', field: 'avg_power_factor', decimals: 3 },
  { label: 'Voltaje prom.', unit: 'V', field: 'avg_voltage_l1', decimals: 1 },
];

/* ── Date range: last 12 months ── */

function getLast12MonthsRange() {
  const now = new Date();
  const from = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

/* ── Component ── */

export function MeterDetailPage() {
  const { meterId } = useParams<{ meterId: string }>();
  const navigate = useNavigate();
  const [selectedMetric, setSelectedMetric] = useState(0);

  const { from, to } = useMemo(getLast12MonthsRange, []);
  const meterQuery = useMeterQuery(meterId!);
  const buildingsQuery = useBuildingsQuery();
  const aggQuery = useAggregatedReadingsQuery(
    { meterId: meterId!, from, to, interval: 'monthly' },
    !!meterId,
  );
  const alertsQuery = useAlertsQuery({ meterId: meterId! });

  const meter = meterQuery.data;
  const building = buildingsQuery.data?.find((b) => b.id === meter?.buildingId);
  const rows = aggQuery.data ?? [];
  const alertCount = alertsQuery.data?.length ?? 0;
  const meta = METRICS[selectedMetric];
  const isLoading = meterQuery.isPending || aggQuery.isPending;

  // Chart data
  const chartData = useMemo(() =>
    rows.map((r) => {
      const d = new Date(r.bucket);
      const label = `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
      const raw = r[meta.field];
      return { label, value: raw != null ? parseFloat(raw) : null };
    }),
    [rows, meta.field],
  );

  // Summary row
  const summary = useMemo(() => {
    const vals = rows.map((r) => r[meta.field]).filter((v): v is string => v != null).map(parseFloat);
    if (vals.length === 0) return null;
    const total = vals.reduce((s, v) => s + v, 0);
    const avg = total / vals.length;
    const max = Math.max(...vals);
    return { total, avg, max };
  }, [rows, meta.field]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => navigate(building ? `/meters?buildingId=${building.id}` : '/meters')}
          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          &larr; Volver
        </button>
        <Link to="/buildings" className="text-[13px] text-gray-500 hover:text-[var(--color-primary)]">Edificios</Link>
        <span className="text-[11px] text-gray-400">/</span>
        {building && (
          <>
            <Link to={`/meters?buildingId=${building.id}`} className="text-[13px] text-gray-500 hover:text-[var(--color-primary)]">
              {building.name}
            </Link>
            <span className="text-[11px] text-gray-400">/</span>
          </>
        )}
        <span className="text-[13px] font-semibold text-gray-900">
          {meter?.name ?? '—'} <span className="font-normal text-gray-500">({meter?.code ?? meterId})</span>
        </span>
        {alertCount > 0 && (
          <Link
            to={`/alerts?meterId=${meterId}`}
            className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-200"
          >
            {alertCount} alerta{alertCount > 1 ? 's' : ''}
          </Link>
        )}
      </div>

      {/* Metric selector pills */}
      <div className="flex shrink-0 flex-wrap gap-1 px-1">
        {METRICS.map((m, i) => (
          <button
            key={m.field}
            type="button"
            onClick={() => setSelectedMetric(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              i === selectedMetric
                ? 'bg-[var(--color-primary,#3a5b1e)] text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="shrink-0">
          <MonthlyChart
            data={chartData}
            seriesName={meta.label}
            unit={meta.unit}
            modes={['column', 'line', 'area']}
          />
        </Card>
      )}

      {/* Monthly table */}
      <Card className="flex min-h-0 flex-1 flex-col" noPadding>
        <div className="px-6 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-gray-900">Detalle mensual</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <Th>Mes</Th>
                <Th>Consumo (kWh)</Th>
                <Th>Pot. prom. (kW)</Th>
                <Th>Pot. peak (kW)</Th>
                <Th>FP</Th>
                <Th>Voltaje (V)</Th>
                <Th>Lecturas</Th>
                <Th></Th>
              </tr>
            </thead>
            <TableStateBody
              phase={isLoading ? 'loading' : rows.length === 0 ? 'empty' : 'ready'}
              colSpan={8}
              emptyMessage="Sin datos de lecturas para este medidor."
              skeletonWidths={['w-16', 'w-20', 'w-20', 'w-20', 'w-16', 'w-20', 'w-16', 'w-12']}
            >
              {rows.map((r) => {
                const d = new Date(r.bucket);
                const monthKey = r.bucket.slice(0, 7); // YYYY-MM
                const label = `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
                return (
                  <tr key={r.bucket} className="hover:bg-gray-50">
                    <Td className="font-medium text-gray-900">{label}</Td>
                    <Td>{fmtNum(r.energy_delta_kwh)}</Td>
                    <Td>{fmtNum(r.avg_power_kw, 2)}</Td>
                    <Td>{fmtNum(r.max_power_kw, 2)}</Td>
                    <Td>{fmtNum(r.avg_power_factor, 3)}</Td>
                    <Td>{fmtNum(r.avg_voltage_l1)}</Td>
                    <Td>{r.reading_count}</Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => navigate(`/monitoring/meter/${meterId}/readings/${monthKey}`)}
                        className="text-xs font-medium text-[var(--color-primary,#3a5b1e)] hover:underline"
                      >
                        Ver &rarr;
                      </button>
                    </Td>
                  </tr>
                );
              })}
              {/* Summary footer */}
              {summary && rows.length > 0 && (
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <Td className="text-gray-900">Total / Prom.</Td>
                  <Td>{fmtNum(rows.reduce((s, r) => s + parseFloat(r.energy_delta_kwh ?? '0'), 0))}</Td>
                  <Td>{fmtNum(summary.avg, 2)}</Td>
                  <Td>{fmtNum(summary.max, 2)}</Td>
                  <Td>
                    {fmtNum(
                      rows.map((r) => r.avg_power_factor).filter((v): v is string => v != null).map(parseFloat).reduce((s, v, _, a) => s + v / a.length, 0),
                      3,
                    )}
                  </Td>
                  <Td>
                    {fmtNum(
                      rows.map((r) => r.avg_voltage_l1).filter((v): v is string => v != null).map(parseFloat).reduce((s, v, _, a) => s + v / a.length, 0),
                    )}
                  </Td>
                  <Td>{rows.reduce((s, r) => s + parseInt(r.reading_count, 10), 0)}</Td>
                  <Td></Td>
                </tr>
              )}
            </TableStateBody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Th({ children }: Readonly<{ children?: React.ReactNode }>) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children?: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${className}`}>{children}</td>;
}

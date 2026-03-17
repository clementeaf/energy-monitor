import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card } from '../../components/ui/Card';
import { MonthlyColumnChart } from '../../components/charts/MonthlyColumnChart';
import { MeterDetailSkeleton } from '../../components/ui/Skeleton';
import { useMeterInfo, useMeterMonthly } from '../../hooks/queries/useMeters';
import { useAlerts } from '../../hooks/queries/useAlerts';
import { MeterMetricSelector } from './components/MeterMetricSelector';
import { MeterMonthlyTable } from './components/MeterMonthlyTable';
import { meterMetrics } from './components/meterMetrics';
import type { MeterMetricKey } from './components/meterMetrics';

export function MeterDetailPage() {
  const { meterId } = useParams<{ meterId: string }>();
  const navigate = useNavigate();
  const { data: meterInfo } = useMeterInfo(meterId!);
  const { data: monthly, isLoading } = useMeterMonthly(meterId!);
  const { data: alerts } = useAlerts({ meter_id: meterId! });
  const [chartMetric, setChartMetric] = useState<MeterMetricKey>('totalKwh');
  const [hoveredMetric, setHoveredMetric] = useState<MeterMetricKey | null>(null);

  if (isLoading) return <MeterDetailSkeleton />;

  const meta = meterMetrics[chartMetric];
  const chartData = (monthly ?? []).map((d) => ({ month: d.month, value: d[chartMetric] }));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1 text-sm text-muted hover:text-text"
          >
            &larr; Volver
          </button>
          <span className="text-sm text-muted">{meterInfo?.storeName ?? '—'}</span>
          <span className="text-sm text-muted">&middot;</span>
          <span className="text-sm font-semibold text-text">{meterId}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {chartData.length > 0 && (
          <Card>
            <div className="mb-3">
              <MeterMetricSelector value={chartMetric} onChange={setChartMetric} onHover={setHoveredMetric} />
            </div>
            <MonthlyColumnChart data={chartData} label={meta.label} unit={meta.unit} />
          </Card>
        )}
        {monthly && monthly.length > 0 && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text">Detalle mensual</h2>
            <MeterMonthlyTable
              data={monthly}
              alerts={alerts ?? []}
              highlightMetric={chartMetric}
              hoveredMetric={hoveredMetric}
              onMonthClick={(month) => navigate(`/meters/${meterId}/readings/${month.slice(0, 7)}`)}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

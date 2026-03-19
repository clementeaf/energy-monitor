import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { PillButton } from '../../components/ui/PillButton';
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
      <div className="mb-3 ml-4 flex shrink-0 flex-wrap items-center gap-2 lg:gap-3">
        <PillButton onClick={() => navigate(meterInfo?.buildingName ? `/buildings/${encodeURIComponent(meterInfo.buildingName)}` : '/buildings')}>&larr; Volver</PillButton>
        <Link to="/buildings" className="text-[13px] text-pa-text-muted hover:text-pa-blue">Activos Inmobiliarios</Link>
        <span className="text-[11px] text-pa-text-muted">/</span>
        {meterInfo?.buildingName && (
          <>
            <Link to={`/buildings/${encodeURIComponent(meterInfo.buildingName)}`} className="text-[13px] text-pa-text-muted hover:text-pa-blue">{meterInfo.buildingName}</Link>
            <span className="text-[11px] text-pa-text-muted">/</span>
          </>
        )}
        <span className="text-[13px] font-bold uppercase tracking-wide text-pa-navy">{meterInfo?.storeName ?? '—'} ({meterId})</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {chartData.length > 0 && (
          <Card className="shrink-0">
            <div className="mb-3">
              <MeterMetricSelector value={chartMetric} onChange={setChartMetric} onHover={setHoveredMetric} />
            </div>
            <MonthlyColumnChart data={chartData} label={meta.label} unit={meta.unit} />
          </Card>
        )}
        {monthly && monthly.length > 0 && (
          <Card className="flex min-h-0 flex-1 flex-col">
            <h2 className="mb-3 shrink-0 text-sm font-semibold text-text">Detalle mensual</h2>
            <div className="min-h-0 flex-1">
              <MeterMonthlyTable
                data={monthly}
                alerts={alerts ?? []}
                highlightMetric={chartMetric}
                hoveredMetric={hoveredMetric}
                onMonthClick={(month) => navigate(`/meters/${meterId}/readings/${month.slice(0, 7)}`)}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

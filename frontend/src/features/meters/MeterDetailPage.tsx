import { useParams, useNavigate } from 'react-router';
import { Card } from '../../components/ui/Card';
import { MonthlyColumnChart } from '../../components/charts/MonthlyColumnChart';
import { MeterDetailSkeleton } from '../../components/ui/Skeleton';
import { useMeterMonthly } from '../../hooks/queries/useMeters';
import { MeterMonthlyTable } from './components/MeterMonthlyTable';

export function MeterDetailPage() {
  const { meterId } = useParams<{ meterId: string }>();
  const navigate = useNavigate();
  const { data: monthly, isLoading } = useMeterMonthly(meterId!);

  if (isLoading) return <MeterDetailSkeleton />;

  const chartData = (monthly ?? []).map((d) => ({ month: d.month, value: d.totalKwh }));

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
          <span className="text-sm font-semibold text-text">{meterId}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {chartData.length > 0 && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text">Consumo mensual (kWh)</h2>
            <MonthlyColumnChart data={chartData} label="Consumo (kWh)" unit="kWh" />
          </Card>
        )}
        {monthly && monthly.length > 0 && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text">Detalle mensual</h2>
            <MeterMonthlyTable data={monthly} />
          </Card>
        )}
      </div>
    </div>
  );
}

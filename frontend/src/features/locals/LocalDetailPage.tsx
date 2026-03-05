import { useState } from 'react';
import { useParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { useLocal, useLocalConsumption } from '../../hooks/queries/useLocals';
import { useBuilding } from '../../hooks/queries/useBuildings';
import { Chart } from '../../components/ui/Chart';
import { LocalConsumptionTable } from './components/LocalConsumptionTable';

export function LocalDetailPage() {
  const { buildingId, localId } = useParams<{ buildingId: string; localId: string }>();
  const { data: building } = useBuilding(buildingId!);
  const { data: local, isLoading } = useLocal(localId!);
  const { data: consumption } = useLocalConsumption(localId!);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);

  if (isLoading) return <p className="text-subtle">Cargando...</p>;
  if (!local) return <p className="text-subtle">Local no encontrado</p>;

  const chartOptions: Highcharts.Options = {
    chart: { type: 'area' },
    title: { text: `Consumo Mensual — ${local.name}` },
    xAxis: { categories: consumption?.map((d) => d.month) ?? [] },
    yAxis: { title: { text: 'kWh' } },
    series: [
      {
        name: 'Consumo',
        type: 'area',
        data: consumption?.map((d) => d.consumption) ?? [],
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(56,139,253,0.25)'],
            [1, 'rgba(56,139,253,0.02)'],
          ],
        },
      },
    ],
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title={local.name}
          showBack
          breadcrumbs={[
            { label: 'Edificios', to: '/' },
            { label: building?.name ?? '...', to: `/buildings/${buildingId}` },
            { label: local.name },
          ]}
        />
        <p className="mb-3 text-sm text-muted">
          {local.type} &middot; Piso {local.floor} &middot; {local.area} m²
        </p>
      </div>

      <div className="shrink-0">
        <Chart
          options={chartOptions}
          onPointHover={setHighlightIndex}
          highlightIndex={highlightIndex}
        />
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <h2 className="mb-2 shrink-0 text-lg font-bold text-text">Detalle de Consumo</h2>
        {consumption && (
          <div className="min-h-0 flex-1">
            <LocalConsumptionTable
              data={consumption}
              highlightIndex={highlightIndex}
              onRowHover={setHighlightIndex}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}

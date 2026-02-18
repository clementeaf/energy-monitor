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

  if (isLoading) return <p className="text-[#999]">Cargando...</p>;
  if (!local) return <p className="text-[#999]">Local no encontrado</p>;

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
        color: '#333',
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(51,51,51,0.3)'],
            [1, 'rgba(51,51,51,0.02)'],
          ],
        },
      },
    ],
  };

  return (
    <div>
      <PageHeader
        title={local.name}
        showBack
        breadcrumbs={[
          { label: 'Edificios', to: '/' },
          { label: building?.name ?? '...', to: `/buildings/${buildingId}` },
          { label: local.name },
        ]}
      />

      <p className="mb-4 text-sm text-[#666]">
        {local.type} &middot; Piso {local.floor} &middot; {local.area} m²
      </p>

      <div className="mb-6">
        <Chart options={chartOptions} />
      </div>

      <h2 className="mb-3 text-lg font-bold text-black">Detalle de Consumo</h2>
      {consumption && <LocalConsumptionTable data={consumption} />}
    </div>
  );
}

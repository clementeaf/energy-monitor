import { useParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { StockChart } from '../../components/ui/StockChart';
import { useMeter, useMeterReadings } from '../../hooks/queries/useMeters';

export function MeterDetailPage() {
  const { meterId } = useParams<{ meterId: string }>();
  const { data: meter, isLoading } = useMeter(meterId!);
  const { data: readings } = useMeterReadings(meterId!, 'hourly');

  if (isLoading) return <p className="text-subtle">Cargando...</p>;
  if (!meter) return <p className="text-subtle">Medidor no encontrado</p>;

  const chartOptions: Highcharts.Options = {
    title: { text: 'Potencia (kW)' },
    yAxis: { title: { text: 'kW' } },
    series: [
      {
        name: 'Potencia',
        type: 'line',
        data: readings?.map((r) => [new Date(r.timestamp).getTime(), r.powerKw]) ?? [],
      },
    ],
    tooltip: {
      xDateFormat: '%d/%m/%Y %H:%M',
    },
  };

  const voltageOptions: Highcharts.Options = {
    title: { text: 'Voltaje (V)' },
    yAxis: { title: { text: 'V' } },
    series: [
      { name: 'L1', type: 'line', data: readings?.map((r) => [new Date(r.timestamp).getTime(), r.voltageL1]) ?? [] },
      { name: 'L2', type: 'line', data: readings?.map((r) => [new Date(r.timestamp).getTime(), r.voltageL2]) ?? [] },
      { name: 'L3', type: 'line', data: readings?.map((r) => [new Date(r.timestamp).getTime(), r.voltageL3]) ?? [] },
    ],
    tooltip: { xDateFormat: '%d/%m/%Y %H:%M' },
  };

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
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        <StockChart options={chartOptions} />
        {meter.phaseType === '3P' && <StockChart options={voltageOptions} />}
      </div>
    </div>
  );
}

import { type ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/Card';
import { useAlerts } from '../../hooks/queries/useAlerts';
import { useMetersOverview } from '../../hooks/queries/useMeters';
import { useAppStore } from '../../store/useAppStore';
import { matchesSelectedSite } from '../../auth/siteScope';
import type { MeterOverview } from '../../types';

function timeAgo(iso: string | null): string {
  if (!iso) return 'Sin lectura';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.floor(hours / 24)} d`;
}

const columns: ColumnDef<MeterOverview, unknown>[] = [
  { accessorKey: 'id', header: 'Medidor' },
  { accessorKey: 'buildingId', header: 'Sitio' },
  { accessorKey: 'model', header: 'Modelo' },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ getValue }) => {
      const value = getValue<string>();
      return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${value === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {value}
        </span>
      );
    },
  },
  {
    accessorKey: 'lastReadingAt',
    header: 'Última lectura',
    cell: ({ getValue }) => <span className="text-muted">{timeAgo(getValue<string | null>())}</span>,
  },
  {
    accessorKey: 'uptime24h',
    header: 'Uptime 24h',
    cell: ({ getValue }) => <span className="font-medium text-text">{getValue<number>().toFixed(1)}%</span>,
  },
  {
    accessorKey: 'alarmCount30d',
    header: 'Alarmas 30d',
  },
];

export function RealtimePage() {
  const navigate = useNavigate();
  const { selectedSiteId } = useAppStore();
  const { data: meters, isLoading } = useMetersOverview();
  const { data: activeAlerts } = useAlerts(
    {
      status: 'active',
      limit: 20,
      buildingId: selectedSiteId && selectedSiteId !== '*' ? selectedSiteId : undefined,
    },
    { refetchInterval: 30_000, staleTime: 10_000 },
  );

  if (isLoading) return <BuildingsPageSkeleton />;

  const scopedMeters = (meters ?? []).filter((meter) => matchesSelectedSite(selectedSiteId, meter.buildingId));
  const online = scopedMeters.filter((meter) => meter.status === 'online').length;
  const offline = scopedMeters.length - online;
  const attention = scopedMeters.filter((meter) => meter.alarmCount30d > 0 || meter.status === 'offline').length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Monitoreo en Tiempo Real" />

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted">Medidores visibles</div>
          <div className="mt-2 text-3xl font-semibold text-text">{scopedMeters.length}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted">Online</div>
          <div className="mt-2 text-3xl font-semibold text-green-400">{online}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted">Offline</div>
          <div className="mt-2 text-3xl font-semibold text-red-400">{offline}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted">Con atención</div>
          <div className="mt-2 text-3xl font-semibold text-yellow-300">{attention}</div>
        </Card>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
        Alertas activas en el contexto actual: <span className="font-medium text-text">{activeAlerts?.length ?? 0}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <DataTable
          data={scopedMeters}
          columns={columns}
          className="h-full cursor-pointer"
          onRowClick={(meter) => navigate(`/meters/${meter.id}`)}
        />
      </div>
    </div>
  );
}
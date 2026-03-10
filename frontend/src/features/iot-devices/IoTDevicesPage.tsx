import { useNavigate } from 'react-router';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { useMetersOverview } from '../../hooks/queries/useMeters';
import { useAppStore } from '../../store/useAppStore';
import { matchesSelectedSite } from '../../auth/siteScope';
import type { MeterOverview } from '../../types';

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

function uptimeColor(pct: number) {
  if (pct >= 99.5) return 'text-green-400';
  if (pct >= 95) return 'text-yellow-400';
  return 'text-red-400';
}

function renderMeterId(value: string) {
  return <span className="font-medium">{value}</span>;
}

function renderStatus(value: string) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${value === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {value}
    </span>
  );
}

function renderLastReading(value: string | null) {
  return <span className="text-muted">{timeAgo(value)}</span>;
}

function renderUptime(value: number) {
  return <span className={`font-medium ${uptimeColor(value)}`}>{value.toFixed(1)}%</span>;
}

function renderAlarmCount(value: number) {
  if (value === 0) return <span className="text-muted">0</span>;
  return <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">{value}</span>;
}

const columns: ColumnDef<MeterOverview, unknown>[] = [
  { accessorKey: 'id', header: 'Medidor', cell: ({ getValue }) => renderMeterId(getValue<string>()) },
  { accessorKey: 'buildingId', header: 'Edificio' },
  { accessorKey: 'model', header: 'Modelo' },
  { accessorKey: 'phaseType', header: 'Fase', size: 60 },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ getValue }) => renderStatus(getValue<string>()),
  },
  {
    accessorKey: 'lastReadingAt',
    header: 'Última Lectura',
    cell: ({ getValue }) => renderLastReading(getValue<string | null>()),
  },
  {
    accessorKey: 'uptime24h',
    header: 'Uptime 24h',
    cell: ({ getValue }) => renderUptime(getValue<number>()),
  },
  {
    accessorKey: 'alarmCount30d',
    header: 'Alarmas 30d',
    cell: ({ getValue }) => renderAlarmCount(getValue<number>()),
  },
];

export function IoTDevicesPage() {
  const { data: meters, isLoading } = useMetersOverview();
  const { selectedSiteId } = useAppStore();
  const navigate = useNavigate();

  if (isLoading) return <BuildingsPageSkeleton />;

  const scopedMeters = (meters ?? []).filter((meter) => matchesSelectedSite(selectedSiteId, meter.buildingId));
  const online = scopedMeters.filter((m) => m.status === 'online').length;
  const total = scopedMeters.length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Inventario y Estado de Dispositivos" />
      <div className="mb-3 flex gap-4 text-sm">
        <span className="text-muted">Total: <span className="font-medium text-text">{total}</span></span>
        <span className="text-muted">Online: <span className="font-medium text-green-400">{online}</span></span>
        <span className="text-muted">Offline: <span className="font-medium text-red-400">{total - online}</span></span>
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

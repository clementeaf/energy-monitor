import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { useMetersOverview } from '../../hooks/queries/useMeters';
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

export function IoTDevicesPage() {
  const { data: meters, isLoading } = useMetersOverview();
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<MeterOverview, unknown>[]>(() => [
    { accessorKey: 'id', header: 'Medidor', cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span> },
    { accessorKey: 'buildingId', header: 'Edificio' },
    { accessorKey: 'model', header: 'Modelo' },
    { accessorKey: 'phaseType', header: 'Fase', size: 60 },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ getValue }) => {
        const s = getValue<string>();
        return (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {s}
          </span>
        );
      },
    },
    {
      accessorKey: 'lastReadingAt',
      header: 'Última Lectura',
      cell: ({ getValue }) => <span className="text-muted">{timeAgo(getValue<string | null>())}</span>,
    },
    {
      accessorKey: 'uptime24h',
      header: 'Uptime 24h',
      cell: ({ getValue }) => {
        const pct = getValue<number>();
        return <span className={`font-medium ${uptimeColor(pct)}`}>{pct.toFixed(1)}%</span>;
      },
    },
    {
      accessorKey: 'alarmCount30d',
      header: 'Alarmas 30d',
      cell: ({ getValue }) => {
        const n = getValue<number>();
        if (n === 0) return <span className="text-muted">0</span>;
        return <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">{n}</span>;
      },
    },
  ], []);

  if (isLoading) return <BuildingsPageSkeleton />;

  const online = meters?.filter((m) => m.status === 'online').length ?? 0;
  const total = meters?.length ?? 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Estado de Dispositivos IoT" />
      <div className="mb-3 flex gap-4 text-sm">
        <span className="text-muted">Total: <span className="font-medium text-text">{total}</span></span>
        <span className="text-muted">Online: <span className="font-medium text-green-400">{online}</span></span>
        <span className="text-muted">Offline: <span className="font-medium text-red-400">{total - online}</span></span>
      </div>
      <div
        className="min-h-0 flex-1 overflow-hidden"
        onClick={(e) => {
          const row = (e.target as HTMLElement).closest('tr');
          if (!row || row.closest('thead')) return;
          const idx = row.rowIndex - 1;
          const meter = meters?.[idx];
          if (meter) navigate(`/meters/${meter.id}`);
        }}
      >
        <DataTable data={meters ?? []} columns={columns} className="h-full cursor-pointer" />
      </div>
    </div>
  );
}

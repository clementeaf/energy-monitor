import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../../components/ui/DataTable';
import { useMeterDowntimeEvents } from '../../../hooks/queries/useMeters';
import type { DowntimeEvent } from '../../../types';

function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return `${hrs}h ${remMins}m`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `${days}d ${remHrs}h`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const columns: ColumnDef<DowntimeEvent, unknown>[] = [
  { accessorKey: 'downtimeStart', header: 'Inicio', cell: ({ getValue }) => fmtDate(getValue() as string) },
  { accessorKey: 'downtimeEnd', header: 'Fin', cell: ({ getValue }) => fmtDate(getValue() as string) },
  { accessorKey: 'durationSeconds', header: 'Duración', cell: ({ getValue }) => formatDuration(getValue() as number) },
];

export function DowntimeEventsTable({ meterId }: { meterId: string }) {
  const range = useMemo(() => {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return { from, to };
  }, []);

  const { data, isLoading } = useMeterDowntimeEvents(meterId, range.from, range.to);

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg bg-raised" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-raised px-4 py-3 text-sm text-muted">
        Sin eventos de downtime en los últimos 30 días
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-text">Eventos de Downtime (últimos 30 días)</h3>
      <DataTable data={data} columns={columns} className="rounded-lg" />
    </div>
  );
}

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../../components/ui/DataTable';
import { useMeterAlarmEvents } from '../../../hooks/queries/useMeters';
import type { AlarmEvent } from '../../../types';

const ALARM_LABELS: Record<string, string> = {
  MODBUS_CRC_ERROR: 'Error CRC',
  BREAKER_OPEN: 'Breaker Abierto',
  HIGH_THD: 'THD Alta',
  PHASE_IMBALANCE: 'Desbalance',
  UNDERVOLTAGE: 'Bajo Voltaje',
  OVERVOLTAGE: 'Alto Voltaje',
  LOW_POWER_FACTOR: 'FP Bajo',
  HIGH_DEMAND: 'Alta Demanda',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtNum(v: number | null, decimals = 1) {
  return v != null ? v.toFixed(decimals) : '—';
}

const columns: ColumnDef<AlarmEvent, unknown>[] = [
  { accessorKey: 'timestamp', header: 'Fecha/Hora', cell: ({ getValue }) => fmtDate(getValue() as string) },
  { accessorKey: 'alarm', header: 'Tipo', cell: ({ getValue }) => ALARM_LABELS[getValue() as string] ?? getValue() },
  { accessorKey: 'voltageL1', header: 'V (L1)', cell: ({ getValue }) => fmtNum(getValue() as number | null) },
  { accessorKey: 'powerFactor', header: 'FP', cell: ({ getValue }) => fmtNum(getValue() as number | null, 3) },
  { accessorKey: 'thdCurrentPct', header: 'THD I(%)', cell: ({ getValue }) => fmtNum(getValue() as number | null) },
];

export function AlarmEventsTable({ meterId }: { meterId: string }) {
  const range = useMemo(() => {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return { from, to };
  }, []);

  const { data, isLoading } = useMeterAlarmEvents(meterId, range.from, range.to);

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg bg-raised" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-raised px-4 py-3 text-sm text-muted">
        Sin eventos de alarma en los últimos 30 días
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-text">Eventos de Alarma (últimos 30 días)</h3>
      <DataTable data={data} columns={columns} className="rounded-lg" />
    </div>
  );
}

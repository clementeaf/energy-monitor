import { type ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/Card';
import { useMetersOverview } from '../../hooks/queries/useMeters';
import { useAppStore } from '../../store/useAppStore';
import { matchesSelectedSite } from '../../auth/siteScope';
import type { MeterOverview } from '../../types';

function lastReadingLabel(value: string | null) {
  if (!value) return 'Sin lectura';
  return new Date(value).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const columns: ColumnDef<MeterOverview, unknown>[] = [
  { accessorKey: 'id', header: 'Medidor' },
  { accessorKey: 'buildingId', header: 'Sitio' },
  { accessorKey: 'model', header: 'Modelo' },
  { accessorKey: 'phaseType', header: 'Fase' },
  { accessorKey: 'status', header: 'Estado' },
  {
    accessorKey: 'lastReadingAt',
    header: 'Última lectura',
    cell: ({ getValue }) => <span className="text-muted">{lastReadingLabel(getValue<string | null>())}</span>,
  },
];

export function AdminMetersPage() {
  const navigate = useNavigate();
  const { selectedSiteId } = useAppStore();
  const { data: meters, isLoading } = useMetersOverview();

  if (isLoading) return <BuildingsPageSkeleton />;

  const scopedMeters = (meters ?? []).filter((meter) => matchesSelectedSite(selectedSiteId, meter.buildingId));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Administración de Medidores" />
      <Card className="mb-4">
        <p className="text-sm text-muted">
          Vista administrativa base para revisar inventario, estado y entrar al detalle técnico de cada medidor.
        </p>
      </Card>
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
import { useNavigate } from 'react-router';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { ContextMenu } from '../../../components/ui/ContextMenu';
import type { MeterListItem } from '../../../types';

const UNOCCUPIED_NAMES = new Set(['Por censar', 'Sin informacion', 'Local no sensado']);

interface MetersTableProps {
  data: MeterListItem[];
  buildingName: string;
  isHolding?: boolean;
  onEdit?: (meter: MeterListItem) => void;
  onDelete?: (meter: MeterListItem) => void;
}

export function MetersTable({ data, buildingName, isHolding, onEdit, onDelete }: MetersTableProps) {
  const navigate = useNavigate();

  const columns: Column<MeterListItem>[] = [
    { label: 'Medidor', value: (r) => r.meterId, align: 'left' },
    {
      label: 'Tienda',
      value: (r) => r.storeName,
      align: 'left',
      cellClassName: (r) =>
        UNOCCUPIED_NAMES.has(r.storeName) || r.storeName.startsWith('Local ') ? 'text-muted' : '',
    },
    { label: 'Tipo', value: (r) => r.storeType || '—', align: 'left' },
  ];

  if (isHolding && onEdit && onDelete) {
    columns.push({
      label: '',
      value: (r) => (
        <ContextMenu items={[
          { label: 'Editar', onClick: () => onEdit(r) },
          { label: 'Eliminar', onClick: () => onDelete(r), danger: true },
        ]} />
      ),
      align: 'right',
    });
  }

  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey={(r) => r.meterId}
      onRowClick={(r) => navigate(`/meters/${r.meterId}`, { state: { buildingName } })}
      maxHeight="max-h-none"
      pageSize={20}
    />
  );
}

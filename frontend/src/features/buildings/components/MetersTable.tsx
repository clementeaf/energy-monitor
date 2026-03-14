import { useNavigate } from 'react-router';
import { PaginatedTable } from '../../../components/ui/PaginatedTable';
import type { Column } from '../../../components/ui/DataTable';
import type { MeterListItem } from '../../../types';

interface MetersTableProps {
  data: MeterListItem[];
  buildingName: string;
}

export function MetersTable({ data, buildingName }: MetersTableProps) {
  const navigate = useNavigate();

  const columns: Column<MeterListItem>[] = [
    { label: 'Medidor', value: (r) => r.meterId, align: 'left' },
    {
      label: 'Tienda',
      value: (r) => r.storeName,
      align: 'left',
      cellClassName: (r) => (r.storeName === 'Por censar' ? 'text-muted' : ''),
    },
    { label: 'Tipo', value: (r) => r.storeType || '—', align: 'left' },
  ];

  return (
    <PaginatedTable
      data={data}
      columns={columns}
      rowKey={(r) => r.meterId}
      onRowClick={(r) => navigate(`/meters/${r.meterId}`, { state: { buildingName } })}
      pageSize={10}
      itemLabel="medidores"
    />
  );
}

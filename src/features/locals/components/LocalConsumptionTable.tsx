import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '../../../components/ui/DataTable';
import type { MonthlyConsumption } from '../../../types';

const columnHelper = createColumnHelper<MonthlyConsumption>();

const columns = [
  columnHelper.accessor('month', {
    header: 'Mes',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('consumption', {
    header: 'Consumo',
    cell: (info) => info.getValue().toLocaleString(),
  }),
  columnHelper.accessor('unit', {
    header: 'Unidad',
    cell: (info) => info.getValue(),
  }),
];

interface Props {
  data: MonthlyConsumption[];
  highlightIndex?: number | null;
  onRowHover?: (index: number | null) => void;
}

export function LocalConsumptionTable({ data, highlightIndex, onRowHover }: Props) {
  return (
    <DataTable
      data={data}
      columns={columns}
      highlightRowIndex={highlightIndex}
      onRowHover={onRowHover}
    />
  );
}

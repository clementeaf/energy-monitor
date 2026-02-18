import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';

interface DataTableProps<T> {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  highlightRowIndex?: number | null;
  onRowHover?: (index: number | null) => void;
}

export function DataTable<T>({ data, columns, highlightRowIndex, onRowHover }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto border border-[#e0e0e0]">
      <table className="w-full text-left text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-[#e0e0e0] bg-[#f5f5f5]">
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 font-semibold text-black cursor-pointer select-none"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const isHighlighted = highlightRowIndex != null && row.index === highlightRowIndex;
            return (
              <tr
                key={row.id}
                className={`border-b border-[#e0e0e0] transition-colors ${
                  isHighlighted ? 'bg-[#e0e0e0]' : 'hover:bg-[#f5f5f5]'
                }`}
                onMouseEnter={() => onRowHover?.(row.index)}
                onMouseLeave={() => onRowHover?.(null)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

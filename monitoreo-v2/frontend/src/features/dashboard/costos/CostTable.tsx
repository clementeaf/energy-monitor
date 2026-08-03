import { useState } from 'react';
import { type CostRow, formatCurrency, downloadCsv } from './costos-utils';

function SortTh({ col, label, sortCol, sortAsc, onSort, right }: Readonly<{
  col: string; label: string; sortCol: string; sortAsc: boolean; onSort: (col: string) => void; right?: boolean;
}>) {
  const active = sortCol === col;
  return (
    <th
      className={`cursor-pointer select-none px-3 py-2 transition-colors hover:text-foreground ${right ? 'text-right' : ''}`}
      onClick={() => onSort(col)}
    >
      {label} {active ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );
}

interface CostTableProps {
  rows: CostRow[];
  currencyKey: string;
}

export function CostTable({ rows, currencyKey }: Readonly<CostTableProps>) {
  const [sortCol, setSortCol] = useState<string>('totalCost');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...rows].sort((a, b) => {
    const getSortVal = (r: CostRow): number | string => {
      if (sortCol === 'buildingName') return r.buildingName;
      if (sortCol === 'countryCode') return r.countryCode;
      if (sortCol === 'consumptionMwh') return r.consumptionMwh;
      if (sortCol === 'avgPricePerMwh') return r.avgPricePerMwh;
      if (sortCol === 'invoiceCount') return r.invoiceCount;
      if (sortCol === 'variationPct') return r.variationPct ?? 0;
      return r.totalCost;
    };
    const va = getSortVal(a);
    const vb = getSortVal(b);
    const cmp = typeof va === 'string' ? (va as string).localeCompare(vb as string) : (va as number) - (vb as number);
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (col: string) => {
    setSortAsc(sortCol === col ? !sortAsc : false);
    setSortCol(col);
  };

  return (
    <div className="flex min-h-0 min-w-0 shrink flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => downloadCsv(sorted, currencyKey)}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-surface"
        >
          Exportar CSV
        </button>
      </div>
      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium text-muted">
              <SortTh col="buildingName" label="Mall" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
              <SortTh col="countryCode" label="País" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
              <SortTh col="consumptionMwh" label="Consumo [MWh]" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} right />
              <SortTh col="avgPricePerMwh" label={`Precio medio [${currencyKey}/MWh]`} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} right />
              <SortTh col="totalCost" label="Costo total" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} right />
              <SortTh col="variationPct" label="Variación %" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} right />
              <th className="px-3 py-1.5 text-right">Proyección cierre</th>
            </tr>
          </thead>
        </table>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full">
            <tbody className="divide-y divide-border">
              {sorted.map((row, i) => (
                <tr key={row.buildingId} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-3 py-1.5 font-medium text-foreground">{row.buildingName}</td>
                  <td className="px-3 py-1.5 text-muted">{row.countryCode}</td>
                  <td className="px-3 py-1.5 text-right text-muted">{row.consumptionMwh.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right text-muted">{row.avgPricePerMwh.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right font-medium text-foreground">{formatCurrency(row.totalCost, currencyKey)}</td>
                  <td className="px-3 py-1.5 text-right text-muted">{row.variationPct != null ? `${row.variationPct > 0 ? '+' : ''}${row.variationPct.toFixed(1)}%` : '—'}</td>
                  <td className="px-3 py-1.5 text-right text-muted">
                    {(() => { const now = new Date(); const d = now.getDate(); const dm = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); return formatCurrency(d > 0 ? (row.totalCost / d) * dm : row.totalCost, currencyKey); })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

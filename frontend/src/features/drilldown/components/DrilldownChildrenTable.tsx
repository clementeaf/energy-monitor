import { useNavigate } from 'react-router';
import type { HierarchyChildSummary } from '../../../types';

const STATUS_STYLES: Record<string, string> = {
  online: 'bg-green-500/20 text-green-400',
  offline: 'bg-red-500/20 text-red-400',
  partial: 'bg-yellow-500/20 text-yellow-400',
};

const NODE_TYPE_LABEL: Record<string, string> = {
  building: 'Edificio',
  panel: 'Tablero',
  subpanel: 'Subtablero',
  circuit: 'Circuito',
};

interface Props {
  children: HierarchyChildSummary[];
  onDrill: (nodeId: string) => void;
}

export function DrilldownChildrenTable({ children, onDrill }: Props) {
  const navigate = useNavigate();
  const totalKwh = children.reduce((s, c) => s + c.totalKwh, 0) || 1;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs text-muted">
            <th className="px-3 py-2">Nombre</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2 text-right">kWh</th>
            <th className="px-3 py-2 text-right">%</th>
            <th className="px-3 py-2 text-right">Medidores</th>
            <th className="px-3 py-2 text-center">Estado</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {children.map((c) => {
            const pct = ((c.totalKwh / totalKwh) * 100).toFixed(1);
            const isCircuit = c.nodeType === 'circuit';
            return (
              <tr
                key={c.id}
                className="cursor-pointer border-b border-border transition-colors hover:bg-raised"
                onClick={() => {
                  if (isCircuit && c.meterId) {
                    navigate(`/meters/${c.meterId}`);
                  } else {
                    onDrill(c.id);
                  }
                }}
              >
                <td className="px-3 py-2 font-medium text-text">{c.name}</td>
                <td className="px-3 py-2 text-subtle">{NODE_TYPE_LABEL[c.nodeType] ?? c.nodeType}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text">{c.totalKwh.toFixed(1)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted">{pct}%</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted">{c.meterCount}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status] ?? ''}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-muted">
                  {isCircuit && c.meterId ? (
                    <span className="text-xs text-accent">Ver medidor</span>
                  ) : (
                    <span className="text-xs">Drill &rarr;</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

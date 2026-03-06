import type { HierarchyNode } from '../../../types';

const LEVEL_LABELS: Record<string, string> = {
  building: 'Edificio',
  panel: 'Tablero',
  subpanel: 'Subtablero',
  circuit: 'Circuito',
};

interface Props {
  path: HierarchyNode[];
  onNavigate: (nodeId: string) => void;
}

export function DrilldownBreadcrumb({ path, onNavigate }: Props) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      {path.map((node, i) => {
        const isLast = i === path.length - 1;
        return (
          <span key={node.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-subtle">/</span>}
            {isLast ? (
              <span className="font-medium text-text">{node.name}</span>
            ) : (
              <button
                onClick={() => onNavigate(node.id)}
                className="text-muted hover:text-accent"
              >
                {node.name}
              </button>
            )}
            {isLast && (
              <span className="ml-1 rounded bg-raised px-1.5 py-0.5 text-xs text-subtle">
                {LEVEL_LABELS[node.nodeType] ?? node.nodeType}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

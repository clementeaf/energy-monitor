import type { ReactNode } from 'react';

export function Th({ children, className = '' }: Readonly<{ children?: ReactNode; className?: string }>) {
  return (
    <th className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '', title }: Readonly<{ children: ReactNode; className?: string; title?: string }>) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 text-sm text-foreground ${className}`} title={title}>
      {children}
    </td>
  );
}

export function StatusBadge({ active }: Readonly<{ active: boolean }>) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-150 ${
        active
          ? 'bg-success/10 text-success ring-1 ring-success/30'
          : 'bg-surface text-muted ring-1 ring-border'
      }`}
    >
      <span className={`mr-1.5 size-1.5 rounded-full ${active ? 'bg-success' : 'bg-subtle'}`} />
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export function ActionBtn({ label, onClick, variant = 'default' }: Readonly<{ label: string; onClick: () => void; variant?: 'default' | 'danger' }>) {
  const cls = variant === 'danger'
    ? 'text-danger hover:bg-danger/10 hover:text-danger'
    : 'text-muted hover:bg-surface hover:text-foreground';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-150 ${cls}`}
    >
      {label}
    </button>
  );
}

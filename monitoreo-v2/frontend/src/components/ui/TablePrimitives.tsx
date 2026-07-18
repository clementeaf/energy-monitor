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

const ACTION_ICONS: Record<string, string> = {
  Editar: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125',
  Eliminar: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
};

export function ActionBtn({ label, onClick, variant = 'default' }: Readonly<{ label: string; onClick: () => void; variant?: 'default' | 'danger' }>) {
  const cls = variant === 'danger'
    ? 'text-danger hover:bg-danger/10 hover:text-danger'
    : 'text-muted hover:bg-surface hover:text-foreground';
  const iconPath = ACTION_ICONS[label];
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label}
      className={`rounded-md p-1 transition-all duration-150 ${cls}`}
    >
      {iconPath ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>
      ) : label}
    </button>
  );
}

import type { ReactNode } from 'react';

export function Th({ children, className = '' }: Readonly<{ children?: ReactNode; className?: string }>) {
  return (
    <th className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '', title }: Readonly<{ children: ReactNode; className?: string; title?: string }>) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${className}`} title={title}>
      {children}
    </td>
  );
}

export function StatusBadge({ active }: Readonly<{ active: boolean }>) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors duration-150 ${
        active ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-gray-50 text-gray-500 ring-1 ring-gray-200'
      }`}
    >
      <span className={`mr-1.5 size-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export function ActionBtn({ label, onClick, variant = 'default' }: Readonly<{ label: string; onClick: () => void; variant?: 'default' | 'danger' }>) {
  const cls = variant === 'danger'
    ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 ${cls}`}
    >
      {label}
    </button>
  );
}

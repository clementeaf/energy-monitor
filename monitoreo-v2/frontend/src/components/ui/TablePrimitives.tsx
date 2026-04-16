import type { ReactNode } from 'react';

export function Th({ children, className = '' }: Readonly<{ children?: ReactNode; className?: string }>) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${className}`}>
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
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export function ActionBtn({ label, onClick, variant = 'default' }: Readonly<{ label: string; onClick: () => void; variant?: 'default' | 'danger' }>) {
  const cls = variant === 'danger'
    ? 'text-red-600 hover:bg-red-50'
    : 'text-gray-600 hover:bg-gray-100';
  return (
    <button type="button" onClick={onClick} className={`rounded px-2 py-1 text-xs font-medium ${cls}`}>
      {label}
    </button>
  );
}

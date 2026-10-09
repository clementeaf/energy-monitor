export function formatNumber(value: number | null, decimals = 0): string {
  if (value === null) return '—';
  return value.toLocaleString('es-CL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function formatMillonesClp(clp: number | null): string {
  if (clp === null) return '—';
  return `$${formatNumber(clp / 1_000_000, 1)}M`;
}

export function formatPeriodo(periodo: Date): string {
  return periodo.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

export function formatNumber(value: number | null, decimals = 0): string {
  if (value === null) return '—';
  return value.toLocaleString('es-CL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatDateTime(iso: string | null, now = new Date()): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (fecha.toDateString() === now.toDateString()) return fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return fecha.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatFecha(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
}

export function formatFechaHora(iso: string): string {
  const fecha = new Date(iso);
  const dia = fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
  const hora = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dia} · ${hora}`;
}

export function formatMillonesClp(clp: number | null): string {
  if (clp === null) return '—';
  return `$${formatNumber(clp / 1_000_000, 1)}M`;
}

export function formatPeriodo(periodo: Date): string {
  return periodo.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

export function inicialesDe(nombre: string): string {
  const [primero = '', segundo = ''] = nombre.split(/[^\p{L}]+/u).filter(Boolean);
  return `${primero.charAt(0)}${segundo.charAt(0)}`.toUpperCase() || '?';
}

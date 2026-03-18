import { MONTH_NAMES_SHORT, MONTH_NAMES_FULL } from './constants';

export function fmt(n: number | null | undefined): string {
  return n != null ? n.toLocaleString('es-CL', { maximumFractionDigits: 1 }) : '—';
}

export function fmtNum(n: number | null | undefined, decimals = 1): string {
  return n != null ? n.toLocaleString('es-CL', { maximumFractionDigits: decimals }) : '—';
}

export function fmtClp(n: number | null | undefined): string {
  return n != null ? `$${n.toLocaleString('es-CL', { maximumFractionDigits: 0 })}` : '—';
}

export function fmtAxis(val: number): string {
  const m = val / 1_000_000;
  if (val >= 1_000_000) return `${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return String(val);
}

export function monthLabel(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_NAMES_SHORT[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

export function monthName(iso: string): string {
  const m = new Date(iso).getMonth();
  return MONTH_NAMES_FULL[m] ?? iso;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

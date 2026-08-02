/* ── Security page types, constants & fallback data ── */

export type PamStatus = 'activo' | 'inactivo' | 'en revisión' | 'suspendido';

export const PAM_BADGE: Record<PamStatus, string> = {
  activo: 'bg-emerald-100 text-emerald-700',
  inactivo: 'bg-red-100 text-red-700',
  'en revisión': 'bg-amber-100 text-amber-700',
  suspendido: 'bg-gray-100 text-gray-600',
};

export const INCIDENT_STATUS_BADGE: Record<string, string> = {
  abierto: 'bg-red-100 text-red-700',
  investigando: 'bg-amber-100 text-amber-700',
  contenido: 'bg-blue-100 text-blue-700',
  resuelto: 'bg-emerald-100 text-emerald-700',
};

export const PRIVILEGED_SLUGS = new Set(['super_admin', 'corp_admin']);

export const SECURITY_TABS = [
  { id: 'postura', label: 'Postura' },
  { id: 'pam', label: 'PAM' },
  { id: 'incidentes', label: 'Incidentes' },
  { id: 'compliance', label: 'Compliance' },
] as const;

export type SecurityTab = (typeof SECURITY_TABS)[number]['id'];

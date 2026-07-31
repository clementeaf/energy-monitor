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

export const FALLBACK_PAM = [
  {
    id: 'fb-pam-1', email: 'c.falcone@hoktus.ai', displayName: 'C. Falcone', isActive: true, createdAt: '2025-01-15T00:00:00Z',
    role: { id: 'r1', name: 'Súper Admin', slug: 'super_admin' },
    lastReview: new Date('2026-07-01'), nextReview: new Date('2026-10-01'), daysUntilReview: 75, pamStatus: 'activo' as const,
  },
  {
    id: 'fb-pam-2', email: 'admin@pasa.cl', displayName: 'Admin PASA', isActive: true, createdAt: '2025-03-01T00:00:00Z',
    role: { id: 'r2', name: 'Corp Admin', slug: 'corp_admin' },
    lastReview: new Date('2026-06-15'), nextReview: new Date('2026-09-15'), daysUntilReview: 59, pamStatus: 'activo' as const,
  },
  {
    id: 'fb-pam-3', email: 'seguridad@pasa.cl', displayName: 'Jefe Seguridad', isActive: true, createdAt: '2025-06-01T00:00:00Z',
    role: { id: 'r2', name: 'Corp Admin', slug: 'corp_admin' },
    lastReview: new Date('2026-07-10'), nextReview: new Date('2026-08-01'), daysUntilReview: 14, pamStatus: 'en revisión' as const,
  },
];

export const FALLBACK_INCIDENTS = [
  {
    id: 'fb-inc-1',
    description: 'Intento de acceso con credenciales expiradas desde IP 185.x (bloqueado por WAF)',
    type: 'brecha' as const,
    severity: 'medium',
    status: 'resuelto',
    date: '07-07-2026',
    responsible: 'c.falcone@hoktus.ai',
  },
  {
    id: 'fb-inc-2',
    description: 'Alerta rate-limit: 2.400 req/5min desde IP 190.x — bloqueada automáticamente',
    type: 'brecha' as const,
    severity: 'low',
    status: 'contenido',
    date: '04-07-2026',
    responsible: 'WAF automático',
  },
];

export const SECURITY_TABS = [
  { id: 'postura', label: 'Postura' },
  { id: 'pam', label: 'PAM' },
  { id: 'incidentes', label: 'Incidentes' },
  { id: 'compliance', label: 'Compliance' },
] as const;

export type SecurityTab = (typeof SECURITY_TABS)[number]['id'];

/** Permission strings allowed on API keys and OAuth client_credentials tokens. */
export const EXTERNAL_API_SCOPES = [
  'buildings:read',
  'meters:read',
  'readings:read',
  'readings:export',
  'readings:create',
  'alerts:read',
  'billing:read',
  'tenant_units:read',
  'hierarchy:read',
  'concentrators:read',
  'fault_events:read',
  'integrations:read',
  'varelectric:create',
] as const;

export type ExternalApiScope = (typeof EXTERNAL_API_SCOPES)[number];

export interface ExternalApiScopeMeta {
  scope: ExternalApiScope;
  label: string;
  description: string;
}

/** Catalog for admin UI and integrator documentation. */
export const EXTERNAL_API_SCOPE_CATALOG: ExternalApiScopeMeta[] = [
  { scope: 'buildings:read', label: 'Edificios', description: 'GET /v1/buildings' },
  { scope: 'meters:read', label: 'Medidores', description: 'GET /v1/meters, /v1/meters/:id/status' },
  { scope: 'readings:read', label: 'Lecturas', description: 'GET /v1/readings*, /v1/iot-readings*' },
  { scope: 'readings:export', label: 'Export ETL', description: 'GET /v1/readings/export, POST/GET /v1/exports' },
  { scope: 'readings:create', label: 'Ingesta', description: 'POST /v1/measurements' },
  { scope: 'alerts:read', label: 'Alertas', description: 'GET /v1/alerts' },
  { scope: 'billing:read', label: 'Facturación', description: 'GET /v1/invoices, /v1/tariffs' },
  { scope: 'tenant_units:read', label: 'Locatarios', description: 'GET /v1/tenant-units' },
  { scope: 'hierarchy:read', label: 'Jerarquía', description: 'GET /v1/hierarchy/buildings/:id' },
  { scope: 'concentrators:read', label: 'Concentradores', description: 'GET /v1/concentrators' },
  { scope: 'fault_events:read', label: 'Eventos de fallo', description: 'GET /v1/fault-events' },
  { scope: 'integrations:read', label: 'Integraciones', description: 'GET /v1/integrations/health' },
  { scope: 'varelectric:create', label: 'Varelectric Ingesta', description: 'POST /v1/varelectric, POST /v1/varelectric/batch' },
];

/**
 * Validates permission strings against the external API scope catalog.
 * @param permissions - Scope strings from API key or OAuth client
 */
export function assertValidExternalApiPermissions(permissions: string[]): void {
  const allowed = new Set<string>(EXTERNAL_API_SCOPES);
  for (const perm of permissions) {
    if (!allowed.has(perm)) {
      throw new Error(`Invalid external API permission: ${perm}`);
    }
  }
}

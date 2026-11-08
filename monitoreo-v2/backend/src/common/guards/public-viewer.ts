import type { Request } from 'express';
import type { JwtPayload } from '../decorators/current-user.decorator';

const PRIVATE_PATH_PREFIXES = [
  '/api/auth',
  '/api/privacy',
  '/api/v1',
  '/api/notification-logs',
  '/api/platform-dashboard',
];

export const PUBLIC_VIEWER_PERMISSIONS = [
  'dashboard_executive:read',
  'dashboard_technical:read',
  'admin_buildings:read',
  'admin_meters:read',
  'admin_hierarchy:read',
  'admin_tenants_units:read',
  'alerts:read',
  'billing:read',
  'buildings:read',
  'concentrators:read',
  'data_quality:read',
  'diagnostics:read',
  'fault_events:read',
  'hierarchy:read',
  'meters:read',
  'monitoring:read',
  'monitoring_faults:read',
  'readings:read',
  'register_mappings:read',
  'reports:read',
  'tenant_units:read',
];

export function buildPublicViewer(tenantId: string): JwtPayload {
  return {
    sub: 'public-viewer',
    email: '',
    tenantId,
    roleId: '',
    roleSlug: 'public_viewer',
    permissions: PUBLIC_VIEWER_PERMISSIONS,
    buildingIds: [],
  };
}

export function resolvePublicViewer(request: Request, publicTenantId: string | undefined): JwtPayload | null {
  if (!publicTenantId) return null;
  if (request.method !== 'GET') return null;
  const isPrivatePath = PRIVATE_PATH_PREFIXES.some((prefix) => request.path === prefix || request.path.startsWith(`${prefix}/`));
  return isPrivatePath ? null : buildPublicViewer(publicTenantId);
}

import type { Request } from 'express';
import type { JwtPayload } from '../decorators/current-user.decorator';

const PUBLIC_READ_PATH_PREFIXES = ['/api/buildings', '/api/meters', '/api/readings'];

export function buildPublicViewer(tenantId: string): JwtPayload {
  return {
    sub: 'public-viewer',
    email: '',
    tenantId,
    roleId: '',
    roleSlug: 'public_viewer',
    permissions: ['dashboard_executive:read', 'dashboard_technical:read'],
    buildingIds: [],
  };
}

export function resolvePublicViewer(request: Request, publicTenantId: string | undefined): JwtPayload | null {
  if (!publicTenantId) return null;
  if (request.method !== 'GET') return null;
  const isPublicPath = PUBLIC_READ_PATH_PREFIXES.some((prefix) => request.path === prefix || request.path.startsWith(`${prefix}/`));
  return isPublicPath ? buildPublicViewer(publicTenantId) : null;
}

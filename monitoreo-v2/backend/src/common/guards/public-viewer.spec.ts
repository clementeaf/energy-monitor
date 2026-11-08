import type { Request } from 'express';
import { PUBLIC_VIEWER_PERMISSIONS, resolvePublicViewer } from './public-viewer';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';

function buildRequest(overrides: Partial<Request>): Request {
  return { method: 'GET', path: '/api/readings/aggregated', headers: {}, cookies: {}, ...overrides } as Request;
}

describe('resolvePublicViewer', () => {
  it('serves anonymous GET requests as a read-only viewer of the configured tenant', () => {
    const viewer = resolvePublicViewer(buildRequest({}), TENANT_ID);

    expect(viewer?.tenantId).toBe(TENANT_ID);
    expect(viewer?.roleSlug).not.toBe('super_admin');
    expect(resolvePublicViewer(buildRequest({ path: '/api/carbon-footprint/summary' }), TENANT_ID)).not.toBeNull();
    expect(resolvePublicViewer(buildRequest({ path: '/api/invoices' }), TENANT_ID)).not.toBeNull();
  });

  it('grants only read permissions and none for admin or security modules', () => {
    expect(PUBLIC_VIEWER_PERMISSIONS.every((permission) => permission.endsWith(':read'))).toBe(true);
    for (const module of ['admin_users', 'admin_roles', 'admin_tenants', 'api_keys', 'oauth_clients', 'audit', 'sso', 'integrations', 'webhooks']) {
      expect(PUBLIC_VIEWER_PERMISSIONS).not.toContain(`${module}:read`);
    }
  });

  it('stays off when the mode is not configured', () => {
    expect(resolvePublicViewer(buildRequest({}), undefined)).toBeNull();
  });

  it('never applies to writes or to private paths', () => {
    expect(resolvePublicViewer(buildRequest({ method: 'POST' }), TENANT_ID)).toBeNull();
    expect(resolvePublicViewer(buildRequest({ path: '/api/auth/me' }), TENANT_ID)).toBeNull();
    expect(resolvePublicViewer(buildRequest({ path: '/api/v1/measurements' }), TENANT_ID)).toBeNull();
    expect(resolvePublicViewer(buildRequest({ path: '/api/notification-logs' }), TENANT_ID)).toBeNull();
    expect(resolvePublicViewer(buildRequest({ path: '/api/privacy/status' }), TENANT_ID)).toBeNull();
  });
});

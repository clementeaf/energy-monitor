import type { Request } from 'express';
import { resolvePublicViewer } from './public-viewer';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';

function buildRequest(overrides: Partial<Request>): Request {
  return { method: 'GET', path: '/api/readings/aggregated', headers: {}, cookies: {}, ...overrides } as Request;
}

describe('resolvePublicViewer', () => {
  it('serves anonymous GET requests on EMS read paths as a read-only viewer of the configured tenant', () => {
    const viewer = resolvePublicViewer(buildRequest({}), TENANT_ID);

    expect(viewer?.tenantId).toBe(TENANT_ID);
    expect(viewer?.permissions).toEqual(['dashboard_executive:read', 'dashboard_technical:read']);
    expect(viewer?.roleSlug).not.toBe('super_admin');
  });

  it('stays off when the mode is not configured', () => {
    expect(resolvePublicViewer(buildRequest({}), undefined)).toBeNull();
  });

  it('never applies to writes or to other paths', () => {
    expect(resolvePublicViewer(buildRequest({ method: 'POST' }), TENANT_ID)).toBeNull();
    expect(resolvePublicViewer(buildRequest({ path: '/api/audit-logs' }), TENANT_ID)).toBeNull();
    expect(resolvePublicViewer(buildRequest({ path: '/api/metersx' }), TENANT_ID)).toBeNull();
  });
});

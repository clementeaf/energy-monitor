import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import type { DataSource } from 'typeorm';
import { AuditLogInterceptor } from './audit-log.interceptor';

function buildContext(user: Record<string, unknown>): ExecutionContext {
  const request = {
    method: 'POST',
    url: '/api/v1/varelectric/batch',
    route: { path: '/api/v1/varelectric/batch' },
    body: { records: [] },
    params: {},
    query: {},
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
    user,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ statusCode: 201 }),
    }),
    getClass: () => ({ name: 'VarelectricIngressController' }),
  } as unknown as ExecutionContext;
}

describe('AuditLogInterceptor', () => {
  const next: CallHandler = { handle: () => of({ inserted: 1 }) };

  async function auditParamsFor(
    user: Record<string, unknown>,
  ): Promise<unknown[]> {
    const query = jest.fn().mockResolvedValue([]);
    const interceptor = new AuditLogInterceptor({
      query,
    } as unknown as DataSource);
    await lastValueFrom(interceptor.intercept(buildContext(user), next));
    await new Promise((resolve) => setImmediate(resolve));
    const [[, params]] = query.mock.calls as [string, unknown[]][];
    return params;
  }

  it('records API key requests with null user_id and the key id in details', async () => {
    const params = await auditParamsFor({
      sub: 'apikey:6f1c2a4e-1111-4222-8333-944455556666',
      tenantId: '84adf8d4-830d-46e1-bef5-e2eac6a19014',
      _apiKeyId: '6f1c2a4e-1111-4222-8333-944455556666',
    });

    expect(params[1]).toBeNull();
    expect(JSON.parse(params[5] as string)).toMatchObject({
      apiKeyId: '6f1c2a4e-1111-4222-8333-944455556666',
    });
  });

  it('records user requests with the user id', async () => {
    const params = await auditParamsFor({
      sub: '0b7f0c1e-2222-4333-8444-955566667777',
      tenantId: '84adf8d4-830d-46e1-bef5-e2eac6a19014',
    });

    expect(params[1]).toBe('0b7f0c1e-2222-4333-8444-955566667777');
    expect(JSON.parse(params[5] as string)).not.toHaveProperty('apiKeyId');
  });
});

import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AuditLogsService } from './audit-logs.service';

const TENANT_ID = 'tenant-1';

const mockRow = {
  id: 'al-1',
  tenant_id: TENANT_ID,
  user_id: 'u-1',
  user_email: 'test@example.com',
  action: 'POST /users',
  resource_type: 'Users',
  resource_id: 'u-2',
  details: { statusCode: 201, duration: 45 },
  ip_address: '127.0.0.1',
  user_agent: 'Mozilla/5.0',
  created_at: new Date('2026-04-01T12:00:00Z'),
};

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let ds: Record<string, jest.Mock>;

  beforeEach(async () => {
    ds = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get(AuditLogsService);
  });

  it('returns paginated audit logs for tenant', async () => {
    ds.query
      .mockResolvedValueOnce([mockRow])
      .mockResolvedValueOnce([{ total: 1 }]);

    const result = await service.findAll(TENANT_ID, {});

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].userId).toBe('u-1');
    expect(result.data[0].userEmail).toBe('test@example.com');
    expect(result.data[0].action).toBe('POST /users');
  });

  it('applies userId filter', async () => {
    ds.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);

    await service.findAll(TENANT_ID, { userId: 'u-1' });

    const selectQuery = ds.query.mock.calls[0][0] as string;
    expect(selectQuery).toContain('a.user_id = $2');
    expect(ds.query.mock.calls[0][1]).toContain('u-1');
  });

  it('applies action filter with ILIKE', async () => {
    ds.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);

    await service.findAll(TENANT_ID, { action: 'POST' });

    const selectQuery = ds.query.mock.calls[0][0] as string;
    expect(selectQuery).toContain('a.action ILIKE');
    expect(ds.query.mock.calls[0][1]).toContain('%POST%');
  });

  it('applies date range filters', async () => {
    ds.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);

    await service.findAll(TENANT_ID, {
      from: '2026-04-01T00:00:00Z',
      to: '2026-04-02T00:00:00Z',
    });

    const selectQuery = ds.query.mock.calls[0][0] as string;
    expect(selectQuery).toContain('a.created_at >=');
    expect(selectQuery).toContain('a.created_at <=');
  });

  it('applies pagination parameters', async () => {
    ds.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 100 }]);

    await service.findAll(TENANT_ID, { limit: 20, offset: 40 });

    const params = ds.query.mock.calls[0][1] as unknown[];
    expect(params).toContain(20);
    expect(params).toContain(40);
  });

  it('uses default limit 50 and offset 0', async () => {
    ds.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);

    await service.findAll(TENANT_ID, {});

    const params = ds.query.mock.calls[0][1] as unknown[];
    expect(params).toContain(50);
    expect(params).toContain(0);
  });
});

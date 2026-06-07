import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let queryMock: jest.Mock;

  beforeEach(async () => {
    queryMock = jest.fn();

    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DataSource, useValue: { query: queryMock } }],
    }).compile();

    controller = module.get(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns ok when database is reachable', async () => {
    queryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ version: '16-portfolio-summary' }]);

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('ok');
    expect(result.schemaVersion).toBe('16-portfolio-summary');
    expect(queryMock).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns degraded when database is unreachable', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'));

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.db).toBe('fail');
    expect(result.schemaVersion).toBeNull();
  });

  it('returns ok with null schemaVersion when registry table is missing', async () => {
    queryMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('relation "schema_migrations" does not exist'));

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('ok');
    expect(result.schemaVersion).toBeNull();
  });
});

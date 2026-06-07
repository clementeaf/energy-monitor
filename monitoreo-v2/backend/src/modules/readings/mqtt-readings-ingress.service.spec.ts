import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { MqttReadingsIngressService } from './mqtt-readings-ingress.service';
import { NormalizationService } from '../../lib/normalization.service';
import type { Integration } from '../platform/entities/integration.entity';

const TENANT = 't-1';
const METER = 'm-1';

function makeIntegration(): Integration {
  return {
    id: 'int-mqtt',
    tenantId: TENANT,
    name: 'MQTT',
    integrationType: 'mqtt',
    status: 'active',
    config: {},
    lastSyncAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Integration;
}

describe('MqttReadingsIngressService', () => {
  let service: MqttReadingsIngressService;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        MqttReadingsIngressService,
        NormalizationService,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get(MqttReadingsIngressService);
  });

  it('returns false for invalid JSON', async () => {
    const result = await service.ingestFromMqttMessage(
      makeIntegration(),
      Buffer.from('not-json'),
    );
    expect(result).toBe(false);
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('returns false when meter not in tenant', async () => {
    ds.query.mockResolvedValueOnce([]);

    const payload = Buffer.from(
      JSON.stringify({
        meterId: METER,
        timestamp: '2026-01-01T00:00:00Z',
        variables: { active_power_w: 1000, energy_import_wh: 500 },
      }),
    );

    const result = await service.ingestFromMqttMessage(makeIntegration(), payload);
    expect(result).toBe(false);
    expect(ds.query).toHaveBeenCalledTimes(1);
  });

  it('inserts normalized reading with source mqtt', async () => {
    ds.query
      .mockResolvedValueOnce([{ tenant_id: TENANT }])
      .mockResolvedValueOnce([{ id: 'r-1' }]);

    const payload = Buffer.from(
      JSON.stringify({
        meterId: METER,
        timestamp: '2026-01-01T00:00:00Z',
        variables: { active_power_w: 2500, energy_import_wh: 10000 },
      }),
    );

    const result = await service.ingestFromMqttMessage(makeIntegration(), payload);
    expect(result).toBe(true);

    const insertSql = ds.query.mock.calls[1][0] as string;
    const insertParams = ds.query.mock.calls[1][1] as unknown[];
    expect(insertSql).toContain('INSERT INTO readings');
    expect(insertParams).toContain('mqtt');
    expect(insertParams).toContain(2.5);
    expect(insertParams).toContain(10);
  });

  it('accepts flat variable keys without variables object', async () => {
    ds.query
      .mockResolvedValueOnce([{ tenant_id: TENANT }])
      .mockResolvedValueOnce([{ id: 'r-2' }]);

    const payload = Buffer.from(
      JSON.stringify({
        meterId: METER,
        timestamp: '2026-01-01T00:00:00Z',
        active_power_w: 1000,
        energy_import_wh: 2000,
      }),
    );

    const result = await service.ingestFromMqttMessage(makeIntegration(), payload);
    expect(result).toBe(true);
  });
});

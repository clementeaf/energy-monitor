import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BacnetReadingsIngressService } from './bacnet-readings-ingress.service';
import { NormalizationService } from '../../lib/normalization.service';

const TENANT = 't-1';
const METER = 'm-bacnet-1';
const PROFILE = 'bacnet-generic';

const MOCK_MAPPINGS = [
  {
    register_key: 'analog-input:1',
    target_field: 'power_kw',
    scale_factor: '1',
    unit: 'kW',
  },
  {
    register_key: 'analog-input:2',
    target_field: 'energy_kwh_total',
    scale_factor: '1',
    unit: 'kWh',
  },
];

describe('BacnetReadingsIngressService (GAP-133)', () => {
  let service: BacnetReadingsIngressService;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        BacnetReadingsIngressService,
        NormalizationService,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get(BacnetReadingsIngressService);
  });

  it('maps BACnet registers via register_mappings and inserts source=bacnet', async () => {
    ds.query
      .mockResolvedValueOnce([{ tenant_id: TENANT }])
      .mockResolvedValueOnce(MOCK_MAPPINGS)
      .mockResolvedValueOnce([{ id: 'r-bacnet-1' }]);

    const inserted = await service.ingestFromBacnetRegisters({
      tenantId: TENANT,
      meterId: METER,
      timestamp: '2026-06-06T12:00:00Z',
      deviceProfile: PROFILE,
      rawRegisters: {
        'analog-input:1': 42.5,
        'analog-input:2': 9800,
      },
    });

    expect(inserted).toBe(true);

    const mappingSql = ds.query.mock.calls[1][0] as string;
    expect(mappingSql).toContain("protocol = 'bacnet'");

    const insertParams = ds.query.mock.calls[2][1] as unknown[];
    expect(insertParams).toContain('bacnet');
    expect(insertParams).toContain(42.5);
    expect(insertParams).toContain(9800);
  });

  it('returns false when no mappings exist for device profile', async () => {
    ds.query
      .mockResolvedValueOnce([{ tenant_id: TENANT }])
      .mockResolvedValueOnce([]);

    const inserted = await service.ingestFromBacnetRegisters({
      tenantId: TENANT,
      meterId: METER,
      timestamp: '2026-06-06T12:00:00Z',
      deviceProfile: 'unknown-profile',
      rawRegisters: { 'analog-input:1': 10 },
    });

    expect(inserted).toBe(false);
    expect(ds.query).toHaveBeenCalledTimes(2);
  });

  it('returns false when meter not in tenant scope', async () => {
    ds.query.mockResolvedValueOnce([]);

    const inserted = await service.ingestFromBacnetRegisters({
      tenantId: TENANT,
      meterId: METER,
      timestamp: '2026-06-06T12:00:00Z',
      deviceProfile: PROFILE,
      rawRegisters: { 'analog-input:1': 10, 'analog-input:2': 20 },
    });

    expect(inserted).toBe(false);
  });
});

import { Test } from '@nestjs/testing';
import { NormalizationService } from './normalization.service';

describe('NormalizationService', () => {
  let service: NormalizationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [NormalizationService],
    }).compile();
    service = module.get(NormalizationService);
  });

  it('applies scale_factor to mapped registers', () => {
    const result = service.apply(
      [
        {
          registerKey: 'active_power_w',
          targetField: 'power_kw',
          scaleFactor: 0.001,
          unit: 'kW',
        },
        {
          registerKey: 'energy_import_wh',
          targetField: 'energy_kwh_total',
          scaleFactor: 0.001,
          unit: 'kWh',
        },
      ],
      {
        active_power_w: 12500,
        energy_import_wh: '4500000',
        unknown_register: 99,
      },
    );

    expect(result.power_kw).toBe(12.5);
    expect(result.energy_kwh_total).toBe(4500);
    expect(result.unknown_register).toBeUndefined();
  });

  it('skips non-numeric raw values', () => {
    const result = service.apply(
      [{ registerKey: '40001', targetField: 'power_kw', scaleFactor: 1 }],
      { '40001': 'not-a-number' },
    );
    expect(result.power_kw).toBeUndefined();
  });

  it('returns empty object when no mappings match', () => {
    const result = service.apply([], { a: 1 });
    expect(result).toEqual({});
  });
});

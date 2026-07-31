import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CarbonFootprintService } from './carbon-footprint.service';

const TENANT_ID = 'tenant-1';
const BUILDING_IDS = ['bld-1', 'bld-2'];

describe('CarbonFootprintService', () => {
  let service: CarbonFootprintService;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        CarbonFootprintService,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get(CarbonFootprintService);
  });

  describe('kwhToTonsCo2', () => {
    it('converts kWh to tCO2e using emission factor', () => {
      // Chile 2024 grid factor: 0.3867 tCO2e/MWh
      const result = CarbonFootprintService.kwhToTonsCo2(1000, 0.3867);
      expect(result).toBeCloseTo(0.3867, 4);
    });

    it('returns 0 for 0 kWh', () => {
      expect(CarbonFootprintService.kwhToTonsCo2(0, 0.3867)).toBe(0);
    });

    it('returns 0 for 0 factor', () => {
      expect(CarbonFootprintService.kwhToTonsCo2(1000, 0)).toBe(0);
    });
  });

  describe('getEmissionFactor', () => {
    it('returns factor for country and year', async () => {
      ds.query.mockResolvedValueOnce([{ factor_tco2e_per_mwh: '0.3867' }]);

      const factor = await service.getEmissionFactor('CL', 2024);

      expect(factor).toBe(0.3867);
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('emission_factors'),
        ['CL', 2024],
      );
    });

    it('falls back to latest year when exact year not found', async () => {
      ds.query
        .mockResolvedValueOnce([]) // exact year
        .mockResolvedValueOnce([{ factor_tco2e_per_mwh: '0.4100' }]); // fallback

      const factor = await service.getEmissionFactor('CL', 2030);

      expect(factor).toBe(0.41);
    });

    it('returns null when no factor exists for country', async () => {
      ds.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const factor = await service.getEmissionFactor('XX', 2024);

      expect(factor).toBeNull();
    });
  });

  describe('getByBuilding', () => {
    it('calculates emissions per building for a date range', async () => {
      // emission factor query
      ds.query.mockResolvedValueOnce([{ factor_tco2e_per_mwh: '0.3867' }]);
      // consumption aggregation query
      ds.query.mockResolvedValueOnce([
        { building_id: 'bld-1', building_name: 'Mall Norte', country_code: 'CL', total_kwh: '50000.000' },
        { building_id: 'bld-2', building_name: 'Mall Sur', country_code: 'CL', total_kwh: '30000.000' },
      ]);

      const result = await service.getByBuilding(TENANT_ID, BUILDING_IDS, {
        from: '2026-01-01',
        to: '2026-06-30',
      });

      expect(result).toHaveLength(2);
      expect(result[0].buildingId).toBe('bld-1');
      expect(result[0].totalKwh).toBe(50000);
      expect(result[0].tonsCo2e).toBeCloseTo(19.335, 2);
      expect(result[1].tonsCo2e).toBeCloseTo(11.601, 2);
    });

    it('returns empty array when no readings exist', async () => {
      ds.query.mockResolvedValueOnce([{ factor_tco2e_per_mwh: '0.3867' }]);
      ds.query.mockResolvedValueOnce([]);

      const result = await service.getByBuilding(TENANT_ID, BUILDING_IDS, {
        from: '2026-01-01',
        to: '2026-06-30',
      });

      expect(result).toEqual([]);
    });
  });

  describe('getTenantSummary', () => {
    it('returns aggregated tenant totals', async () => {
      ds.query.mockResolvedValueOnce([{ factor_tco2e_per_mwh: '0.3867' }]);
      ds.query.mockResolvedValueOnce([
        { total_kwh: '80000.000', country_code: 'CL' },
      ]);

      const result = await service.getTenantSummary(TENANT_ID, BUILDING_IDS, {
        from: '2026-01-01',
        to: '2026-06-30',
      });

      expect(result.totalKwh).toBe(80000);
      expect(result.tonsCo2e).toBeCloseTo(30.936, 2);
      expect(result.factorUsed).toBe(0.3867);
    });
  });

  describe('getMonthlyBreakdown', () => {
    it('returns monthly emissions for a building', async () => {
      ds.query.mockResolvedValueOnce([{ factor_tco2e_per_mwh: '0.3867' }]);
      ds.query.mockResolvedValueOnce([
        { month: '2026-01', total_kwh: '10000.000' },
        { month: '2026-02', total_kwh: '12000.000' },
        { month: '2026-03', total_kwh: '9000.000' },
      ]);

      const result = await service.getMonthlyBreakdown(TENANT_ID, BUILDING_IDS, {
        from: '2026-01-01',
        to: '2026-03-31',
        buildingId: 'bld-1',
      });

      expect(result).toHaveLength(3);
      expect(result[0].month).toBe('2026-01');
      expect(result[0].tonsCo2e).toBeCloseTo(3.867, 3);
      expect(result[1].tonsCo2e).toBeCloseTo(4.6404, 3);
    });
  });
});

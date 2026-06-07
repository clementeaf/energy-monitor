import { NormalizationService } from './normalization.service';
import {
  SIEMENS_POC3000_IOT_MAPPINGS,
  normalizeIotVariableRow,
} from './iot-variable-mappings';

describe('iot-variable-mappings', () => {
  let normalizationService: NormalizationService;

  beforeEach(() => {
    normalizationService = new NormalizationService();
  });

  it('maps active_power_w to power_kw via scale 0.001', () => {
    const result = normalizeIotVariableRow(
      normalizationService.apply.bind(normalizationService),
      { active_power_w: 12500, energy_import_wh: 1000 },
    );

    expect(result.power_kw).toBe(12.5);
    expect(result.energy_kwh_total).toBe(1);
  });

  it('uses siemens-poc3000 template by default', () => {
    expect(SIEMENS_POC3000_IOT_MAPPINGS.length).toBeGreaterThanOrEqual(14);
    expect(
      SIEMENS_POC3000_IOT_MAPPINGS.some((m) => m.registerKey === 'active_power_w'),
    ).toBe(true);
  });
});

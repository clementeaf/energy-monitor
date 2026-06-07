import { mapIotQualityToReadingQuality } from '../../common/constants/reading-quality';

describe('mapIotQualityToReadingQuality', () => {
  it('maps 0 to measured', () => {
    expect(mapIotQualityToReadingQuality(0)).toBe('measured');
  });

  it('maps 1 to estimated', () => {
    expect(mapIotQualityToReadingQuality(1)).toBe('estimated');
  });

  it('maps 2+ to invalid', () => {
    expect(mapIotQualityToReadingQuality(2)).toBe('invalid');
  });

  it('maps null to unknown', () => {
    expect(mapIotQualityToReadingQuality(null)).toBe('unknown');
  });
});

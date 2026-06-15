import { parseQualityFilter, qualityWhereFragment } from './quality-filter-sql';

describe('quality-filter-sql', () => {
  describe('parseQualityFilter', () => {
    it('returns null for undefined', () => {
      expect(parseQualityFilter(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseQualityFilter('')).toBeNull();
    });

    it('parses single valid quality', () => {
      expect(parseQualityFilter('measured')).toEqual(['measured']);
    });

    it('parses multiple valid qualities', () => {
      expect(parseQualityFilter('measured,estimated')).toEqual(['measured', 'estimated']);
    });

    it('parses all four valid qualities', () => {
      expect(parseQualityFilter('measured,estimated,invalid,unknown')).toEqual([
        'measured', 'estimated', 'invalid', 'unknown',
      ]);
    });

    it('strips invalid values', () => {
      expect(parseQualityFilter('measured,garbage,estimated')).toEqual(['measured', 'estimated']);
    });

    it('returns null when all values are invalid', () => {
      expect(parseQualityFilter('garbage,nonsense')).toBeNull();
    });

    it('trims whitespace around values', () => {
      expect(parseQualityFilter(' measured , estimated ')).toEqual(['measured', 'estimated']);
    });
  });

  describe('qualityWhereFragment', () => {
    it('returns null when qualities is null', () => {
      expect(qualityWhereFragment('r', 1, null)).toBeNull();
    });

    it('builds clause with alias', () => {
      const result = qualityWhereFragment('r', 3, ['measured', 'estimated']);
      expect(result).toEqual({
        clause: 'r.quality = ANY($3::reading_quality[])',
        params: [['measured', 'estimated']],
        nextIdx: 4,
      });
    });

    it('builds clause without alias', () => {
      const result = qualityWhereFragment('', 5, ['invalid']);
      expect(result).toEqual({
        clause: 'quality = ANY($5::reading_quality[])',
        params: [['invalid']],
        nextIdx: 6,
      });
    });

    it('increments parameter index correctly', () => {
      const result = qualityWhereFragment('r', 1, ['measured']);
      expect(result!.nextIdx).toBe(2);
    });
  });
});

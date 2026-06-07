import { parseContractHeader, formatContractHeader } from '../../common/constants/data-contracts';

describe('data-contracts constants', () => {
  it('parses name@version header', () => {
    expect(parseContractHeader('readings-export@1.0.0')).toEqual({
      name: 'readings-export',
      version: '1.0.0',
    });
  });

  it('returns null for invalid header', () => {
    expect(parseContractHeader('invalid')).toBeNull();
  });

  it('formats contract header', () => {
    expect(formatContractHeader('readings-export', '1.0.0')).toBe('readings-export@1.0.0');
  });
});

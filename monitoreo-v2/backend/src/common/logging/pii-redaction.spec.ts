import { maskEmail, maskProviderId } from './pii-redaction';

describe('PII redaction', () => {
  describe('maskEmail', () => {
    it('masks email preserving first char and domain', () => {
      expect(maskEmail('user@example.com')).toBe('u***@example.com');
    });

    it('handles single-char local part', () => {
      expect(maskEmail('a@b.com')).toBe('a***@b.com');
    });

    it('handles long local part', () => {
      expect(maskEmail('verylongemail@domain.org')).toBe('v***@domain.org');
    });

    it('returns *** for invalid email without @', () => {
      expect(maskEmail('nope')).toBe('***');
    });

    it('returns *** for email starting with @', () => {
      expect(maskEmail('@domain.com')).toBe('***');
    });
  });

  describe('maskProviderId', () => {
    it('masks keeping first 3 chars', () => {
      expect(maskProviderId('1234567890')).toBe('123***');
    });

    it('returns *** for short ids', () => {
      expect(maskProviderId('ab')).toBe('***');
    });

    it('handles exactly 3 chars', () => {
      expect(maskProviderId('abc')).toBe('***');
    });

    it('handles 4+ chars', () => {
      expect(maskProviderId('abcd')).toBe('abc***');
    });
  });
});

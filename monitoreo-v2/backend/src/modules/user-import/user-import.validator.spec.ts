import { collectFieldValidationErrors, validatePhone } from './user-import.validator';

describe('user-import.validator', () => {
  it('collects field validation errors', () => {
    const errors = collectFieldValidationErrors({
      email: 'not-an-email',
      authProvider: null,
      roleSlug: '',
      phone: '+569',
    });
    expect(errors).toContain('INVALID_EMAIL');
    expect(errors).toContain('INVALID_PROVIDER');
    expect(errors).toContain('MISSING_ROLE');
    expect(errors).toContain('INVALID_PHONE');
  });

  it('accepts valid optional phone', () => {
    expect(validatePhone('+56912345678')).toBeNull();
    expect(validatePhone(null)).toBeNull();
  });
});

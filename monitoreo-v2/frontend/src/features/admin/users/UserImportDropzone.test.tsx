import { describe, it, expect } from 'vitest';
import { validateUserImportFile } from './UserImportDropzone';

describe('validateUserImportFile', () => {
  it('rejects PDF files', () => {
    const file = new File(['%PDF'], 'users.pdf', { type: 'application/pdf' });
    expect(validateUserImportFile(file)).toMatch(/PDF no soportado/i);
  });

  it('accepts CSV files under size limit', () => {
    const file = new File(['email,auth_provider,role_slug'], 'users.csv', { type: 'text/csv' });
    expect(validateUserImportFile(file)).toBeNull();
  });

  it('rejects files over 1 MB', () => {
    const bigContent = new Uint8Array(1_048_577);
    const file = new File([bigContent], 'big.csv', { type: 'text/csv' });
    expect(validateUserImportFile(file)).toMatch(/1 MB/i);
  });
});

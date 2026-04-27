import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { MfaService } from './mfa.service';

// Mock otplib
jest.mock('otplib', () => ({
  generateSecret: jest.fn().mockReturnValue('JBSWY3DPEHPK3PXP'),
  generateURI: jest.fn().mockReturnValue('otpauth://totp/EnergyMonitor:user@test.com?secret=JBSWY3DPEHPK3PXP&issuer=EnergyMonitor'),
  verifySync: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qrcode'),
}));

import { verifySync } from 'otplib';

describe('MfaService', () => {
  let service: MfaService;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get(MfaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('setupMfa', () => {
    it('should generate secret and QR code', async () => {
      ds.query.mockResolvedValue([]);

      const result = await service.setupMfa('user-1', 'user@test.com');

      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.qrDataUrl).toContain('data:image/png');
      expect(result.otpauthUrl).toContain('otpauth://totp');
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET mfa_secret'),
        ['JBSWY3DPEHPK3PXP', 'user-1'],
      );
    });
  });

  describe('verifyAndEnable', () => {
    it('should enable MFA and return recovery codes when code is valid', async () => {
      ds.query
        .mockResolvedValueOnce([{ mfa_secret: 'JBSWY3DPEHPK3PXP' }]) // SELECT
        .mockResolvedValueOnce([]) // UPDATE mfa_enabled
        .mockResolvedValueOnce([{ tenant_id: 'tenant-1' }]) // audit: SELECT tenant
        .mockResolvedValueOnce([]); // audit: INSERT

      (verifySync as jest.Mock).mockReturnValue({ valid: true });

      const result = await service.verifyAndEnable('user-1', '123456');

      expect(result.recoveryCodes).toHaveLength(8);
      expect(result.recoveryCodes[0]).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}$/);
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('mfa_enabled = true'),
        expect.arrayContaining(['user-1']),
      );
    });

    it('should throw when no secret exists', async () => {
      ds.query.mockResolvedValueOnce([]);

      await expect(service.verifyAndEnable('user-1', '123456'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw when code is invalid', async () => {
      ds.query.mockResolvedValueOnce([{ mfa_secret: 'JBSWY3DPEHPK3PXP' }]);
      (verifySync as jest.Mock).mockReturnValue({ valid: false });

      await expect(service.verifyAndEnable('user-1', '000000'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('validate', () => {
    it('should return false when MFA not enabled (endpoint only for MFA-enabled users)', async () => {
      ds.query.mockResolvedValueOnce([{ mfa_secret: null, mfa_enabled: false, mfa_recovery_codes: null }]);

      const result = await service.validate('user-1', '123456');
      expect(result).toBe(false);
    });

    it('should return true when TOTP code is valid', async () => {
      ds.query.mockResolvedValueOnce([{
        mfa_secret: 'JBSWY3DPEHPK3PXP',
        mfa_enabled: true,
        mfa_recovery_codes: null,
      }]);
      (verifySync as jest.Mock).mockReturnValue({ valid: true });

      const result = await service.validate('user-1', '123456');
      expect(result).toBe(true);
    });

    it('should return false when TOTP and recovery codes both fail', async () => {
      ds.query.mockResolvedValueOnce([{
        mfa_secret: 'JBSWY3DPEHPK3PXP',
        mfa_enabled: true,
        mfa_recovery_codes: JSON.stringify(['somehash']),
      }]);
      (verifySync as jest.Mock).mockReturnValue({ valid: false });

      const result = await service.validate('user-1', '000000');
      expect(result).toBe(false);
    });
  });

  describe('isMfaEnabled', () => {
    it('should return true when MFA is enabled', async () => {
      ds.query.mockResolvedValueOnce([{ mfa_enabled: true }]);
      expect(await service.isMfaEnabled('user-1')).toBe(true);
    });

    it('should return false when user not found', async () => {
      ds.query.mockResolvedValueOnce([]);
      expect(await service.isMfaEnabled('user-1')).toBe(false);
    });
  });

  describe('disable', () => {
    it('should clear MFA fields and log audit event', async () => {
      ds.query
        .mockResolvedValueOnce([]) // UPDATE
        .mockResolvedValueOnce([{ tenant_id: 'tenant-1' }]) // audit: SELECT
        .mockResolvedValueOnce([]); // audit: INSERT

      await service.disable('user-1');

      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('mfa_secret = NULL'),
        ['user-1'],
      );
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining(['MFA_DISABLED']),
      );
    });
  });

  describe('getRecoveryCodeCount', () => {
    it('should return count of remaining codes', async () => {
      ds.query.mockResolvedValueOnce([{ mfa_recovery_codes: JSON.stringify(['a', 'b', 'c']) }]);
      expect(await service.getRecoveryCodeCount('user-1')).toBe(3);
    });

    it('should return 0 when no codes stored', async () => {
      ds.query.mockResolvedValueOnce([{ mfa_recovery_codes: null }]);
      expect(await service.getRecoveryCodeCount('user-1')).toBe(0);
    });
  });

  describe('recovery code validation', () => {
    it('should accept valid recovery code and consume it', async () => {
      // Generate a known recovery code hash
      const crypto = require('crypto');
      const code = 'abcd-ef01';
      const hash = crypto.createHash('sha256').update(code.replace('-', '')).digest('hex');

      ds.query
        .mockResolvedValueOnce([{
          mfa_secret: 'JBSWY3DPEHPK3PXP',
          mfa_enabled: true,
          mfa_recovery_codes: JSON.stringify([hash, 'otherhash']),
        }])
        .mockResolvedValueOnce([]) // UPDATE recovery codes
        .mockResolvedValueOnce([{ tenant_id: 'tenant-1' }]) // audit SELECT
        .mockResolvedValueOnce([]); // audit INSERT

      (verifySync as jest.Mock).mockReturnValue({ valid: false });

      const result = await service.validate('user-1', code);
      expect(result).toBe(true);

      // Should have saved with one fewer code
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('mfa_recovery_codes'),
        [JSON.stringify(['otherhash']), 'user-1'],
      );
    });
  });
});

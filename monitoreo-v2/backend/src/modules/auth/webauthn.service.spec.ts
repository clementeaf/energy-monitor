import { Test } from '@nestjs/testing';
import { WebAuthnService } from './webauthn.service';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

describe('WebAuthnService', () => {
  let service: WebAuthnService;
  let mockDataSource: { query: jest.Mock };

  beforeEach(async () => {
    mockDataSource = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        WebAuthnService,
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, string> = {
                WEBAUTHN_RP_NAME: 'Energy Monitor',
                WEBAUTHN_RP_ID: 'power-monitor.cloud',
                WEBAUTHN_ORIGIN: 'https://power-monitor.cloud',
              };
              return map[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get(WebAuthnService);
  });

  describe('generateRegistrationOptions', () => {
    it('returns options with rpName and rpID', async () => {
      mockDataSource.query.mockResolvedValue([]);
      const options = await service.generateRegistrationOptions('user-1', 'test@test.com');
      expect(options.rp.name).toBe('Energy Monitor');
      expect(options.rp.id).toBe('power-monitor.cloud');
      expect(options.user.name).toBe('test@test.com');
    });

    it('excludes existing credentials', async () => {
      mockDataSource.query.mockResolvedValue([
        { credential_id: 'abc123', transports: ['usb'] },
      ]);
      const options = await service.generateRegistrationOptions('user-1', 'test@test.com');
      expect(options.excludeCredentials).toHaveLength(1);
      expect(options.excludeCredentials![0].id).toBe('abc123');
    });
  });

  describe('generateAuthenticationOptions', () => {
    it('returns options with allowCredentials from DB', async () => {
      mockDataSource.query.mockResolvedValue([
        { credential_id: 'cred-1', transports: ['internal'] },
        { credential_id: 'cred-2', transports: ['usb', 'nfc'] },
      ]);
      const options = await service.generateAuthenticationOptions('user-1');
      expect(options.allowCredentials).toHaveLength(2);
      expect(options.rpId).toBe('power-monitor.cloud');
    });

    it('returns empty allowCredentials if user has no credentials', async () => {
      mockDataSource.query.mockResolvedValue([]);
      const options = await service.generateAuthenticationOptions('user-1');
      expect(options.allowCredentials).toHaveLength(0);
    });
  });

  describe('getUserCredentials', () => {
    it('returns credential list', async () => {
      mockDataSource.query.mockResolvedValue([
        { id: 'c1', credential_id: 'cred-1', device_name: 'MacBook', created_at: '2026-01-01' },
      ]);
      const creds = await service.getUserCredentials('user-1');
      expect(creds).toHaveLength(1);
      expect(creds[0].device_name).toBe('MacBook');
    });
  });

  describe('deleteCredential', () => {
    it('deletes by id and user_id', async () => {
      mockDataSource.query.mockResolvedValue([]);
      await service.deleteCredential('cred-id', 'user-1');
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_credentials'),
        ['cred-id', 'user-1'],
      );
    });
  });
});

import { FtpConnector } from './ftp.connector';
import type { Integration } from '../../platform/entities/integration.entity';

// Mock basic-ftp
const mockAccess = jest.fn();
const mockList = jest.fn();
const mockClose = jest.fn();

jest.mock('basic-ftp', () => ({
  Client: jest.fn().mockImplementation(() => ({
    ftp: { verbose: false },
    access: mockAccess,
    list: mockList,
    close: mockClose,
  })),
}));

function makeIntegration(config: Record<string, unknown>): Integration {
  return {
    id: 'int-4',
    tenantId: 't-1',
    name: 'Test FTP',
    integrationType: 'ftp',
    status: 'active',
    config,
    lastSyncAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Integration;
}

describe('FtpConnector', () => {
  let connector: FtpConnector;

  beforeEach(() => {
    connector = new FtpConnector();
    mockAccess.mockReset().mockResolvedValue(undefined);
    mockList.mockReset();
    mockClose.mockReset();
  });

  describe('validateConfig', () => {
    it('requires host', () => {
      const errors = connector.validateConfig({});
      expect(errors).toContain('host is required and must be a string');
    });

    it('accepts valid minimal config', () => {
      const errors = connector.validateConfig({ host: 'ftp.example.com' });
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid port', () => {
      const errors = connector.validateConfig({ host: 'ftp.example.com', port: 99999 });
      expect(errors).toContain('port must be a number between 1 and 65535');
    });

    it('rejects non-string username', () => {
      const errors = connector.validateConfig({ host: 'ftp.example.com', username: 123 });
      expect(errors).toContain('username must be a string');
    });

    it('rejects non-boolean secure', () => {
      const errors = connector.validateConfig({ host: 'ftp.example.com', secure: 'yes' });
      expect(errors).toContain('secure must be a boolean');
    });

    it('rejects non-string filePattern', () => {
      const errors = connector.validateConfig({ host: 'ftp.example.com', filePattern: 42 });
      expect(errors).toContain('filePattern must be a string');
    });

    it('accepts full valid config', () => {
      const errors = connector.validateConfig({
        host: 'ftp.example.com',
        port: 21,
        username: 'user',
        password: 'pass',
        remotePath: '/data/readings',
        secure: true,
        filePattern: '*.csv',
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('sync', () => {
    it('connects and lists files, returns count', async () => {
      mockList.mockResolvedValue([
        { name: 'data_2026.csv', type: 1 },
        { name: 'data_2025.csv', type: 1 },
        { name: 'subdir', type: 2 }, // directory — excluded
      ]);

      const result = await connector.sync(
        makeIntegration({ host: 'ftp.example.com' }),
      );

      expect(result.status).toBe('success');
      expect(result.recordsSynced).toBe(2); // directories excluded
      expect(result.errorMessage).toBeNull();
      expect(mockAccess).toHaveBeenCalledWith(
        expect.objectContaining({ host: 'ftp.example.com', port: 21 }),
      );
      expect(mockList).toHaveBeenCalledWith('/');
      expect(mockClose).toHaveBeenCalled();
    });

    it('filters files by filePattern', async () => {
      mockList.mockResolvedValue([
        { name: 'readings_01.csv', type: 1 },
        { name: 'readings_02.csv', type: 1 },
        { name: 'config.xml', type: 1 },
        { name: 'readme.txt', type: 1 },
      ]);

      const result = await connector.sync(
        makeIntegration({ host: 'ftp.example.com', filePattern: '*.csv' }),
      );

      expect(result.recordsSynced).toBe(2);
    });

    it('uses custom remotePath', async () => {
      mockList.mockResolvedValue([]);

      await connector.sync(
        makeIntegration({ host: 'ftp.example.com', remotePath: '/exports/energy' }),
      );

      expect(mockList).toHaveBeenCalledWith('/exports/energy');
    });

    it('passes secure flag to access', async () => {
      mockList.mockResolvedValue([]);

      await connector.sync(
        makeIntegration({ host: 'ftp.example.com', secure: true, port: 990 }),
      );

      expect(mockAccess).toHaveBeenCalledWith(
        expect.objectContaining({ secure: true, port: 990 }),
      );
    });

    it('returns failed on connection error', async () => {
      mockAccess.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await connector.sync(
        makeIntegration({ host: 'ftp.example.com' }),
      );

      expect(result.status).toBe('failed');
      expect(result.recordsSynced).toBe(0);
      expect(result.errorMessage).toContain('ECONNREFUSED');
      expect(mockClose).toHaveBeenCalled();
    });

    it('returns failed on list error', async () => {
      mockList.mockRejectedValue(new Error('Permission denied'));

      const result = await connector.sync(
        makeIntegration({ host: 'ftp.example.com' }),
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('Permission denied');
    });

    it('glob pattern ? matches single char', async () => {
      mockList.mockResolvedValue([
        { name: 'data_A.csv', type: 1 },
        { name: 'data_AB.csv', type: 1 },
      ]);

      const result = await connector.sync(
        makeIntegration({ host: 'ftp.example.com', filePattern: 'data_?.csv' }),
      );

      expect(result.recordsSynced).toBe(1);
    });
  });
});

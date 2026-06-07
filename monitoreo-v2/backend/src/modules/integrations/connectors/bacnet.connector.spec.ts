import { BacnetConnector } from './bacnet.connector';
import type { Integration } from '../../platform/entities/integration.entity';
import type { BacnetPingClient, BacnetPingResult } from './bacnet-ping.client';

function makeIntegration(config: Record<string, unknown>): Integration {
  return {
    id: 'int-bacnet',
    tenantId: 't-1',
    name: 'Test BACnet',
    integrationType: 'bacnet',
    status: 'active',
    config,
    lastSyncAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Integration;
}

function mockPingClient(result: BacnetPingResult): BacnetPingClient {
  return {
    ping: jest.fn().mockResolvedValue(result),
  };
}

describe('BacnetConnector', () => {
  describe('validateConfig', () => {
    const connector = new BacnetConnector();

    it('requires host', () => {
      const errors = connector.validateConfig({ deviceId: 100 });
      expect(errors).toContain('host is required and must be a string');
    });

    it('requires deviceId', () => {
      const errors = connector.validateConfig({ host: '192.168.1.10' });
      expect(errors).toContain('deviceId is required and must be a number');
    });

    it('rejects invalid deviceId range', () => {
      const errors = connector.validateConfig({ host: '192.168.1.10', deviceId: 5_000_000 });
      expect(errors).toContain('deviceId must be between 0 and 4194303');
    });

    it('accepts valid minimal config', () => {
      const errors = connector.validateConfig({ host: '192.168.1.10', deviceId: 1234 });
      expect(errors).toHaveLength(0);
    });
  });

  describe('sync', () => {
    it('returns success when ping is reachable', async () => {
      const connector = new BacnetConnector(
        mockPingClient({ reachable: true, respondedDeviceId: 1234, errorMessage: null }),
      );

      const result = await connector.sync(
        makeIntegration({ host: '192.168.1.10', deviceId: 1234 }),
      );

      expect(result.status).toBe('success');
      expect(result.recordsSynced).toBe(1);
    });

    it('returns failed when ping times out', async () => {
      const connector = new BacnetConnector(
        mockPingClient({
          reachable: false,
          respondedDeviceId: null,
          errorMessage: 'BACnet ping timeout after 6000ms',
        }),
      );

      const result = await connector.sync(
        makeIntegration({ host: '192.168.1.99', deviceId: 99 }),
      );

      expect(result.status).toBe('failed');
      expect(result.recordsSynced).toBe(0);
      expect(result.errorMessage).toContain('timeout');
    });
  });
});

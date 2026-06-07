import { SnmpConnector } from './snmp.connector';
import type { Integration } from '../../platform/entities/integration.entity';
import type { SnmpPingClient, SnmpPingResult } from './snmp-ping.client';

function makeIntegration(config: Record<string, unknown>): Integration {
  return {
    id: 'int-snmp',
    tenantId: 't-1',
    name: 'Test SNMP',
    integrationType: 'snmp',
    status: 'active',
    config,
    lastSyncAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Integration;
}

function mockPingClient(result: SnmpPingResult): SnmpPingClient {
  return {
    ping: jest.fn().mockResolvedValue(result),
  };
}

describe('SnmpConnector', () => {
  describe('validateConfig', () => {
    const connector = new SnmpConnector();

    it('requires host and community', () => {
      const errors = connector.validateConfig({});
      expect(errors).toContain('host is required and must be a string');
      expect(errors).toContain('community is required and must be a string');
    });

    it('rejects empty community', () => {
      const errors = connector.validateConfig({ host: '10.0.0.1', community: '' });
      expect(errors).toContain('community must not be empty');
    });

    it('accepts valid minimal config', () => {
      const errors = connector.validateConfig({ host: '10.0.0.1', community: 'public' });
      expect(errors).toHaveLength(0);
    });
  });

  describe('sync', () => {
    it('returns success when ping is reachable', async () => {
      const connector = new SnmpConnector(
        mockPingClient({ reachable: true, errorMessage: null }),
      );

      const result = await connector.sync(
        makeIntegration({ host: '10.0.0.1', community: 'public' }),
      );

      expect(result.status).toBe('success');
      expect(result.recordsSynced).toBe(1);
    });

    it('returns failed when ping times out', async () => {
      const connector = new SnmpConnector(
        mockPingClient({ reachable: false, errorMessage: 'SNMP ping timeout after 6000ms' }),
      );

      const result = await connector.sync(
        makeIntegration({ host: '10.0.0.99', community: 'public' }),
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('timeout');
    });

    it('rejects SNMPv1 in stub', async () => {
      const connector = new SnmpConnector(
        mockPingClient({ reachable: true, errorMessage: null }),
      );

      const result = await connector.sync(
        makeIntegration({ host: '10.0.0.1', community: 'public', version: '1' }),
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('SNMPv1');
    });
  });
});

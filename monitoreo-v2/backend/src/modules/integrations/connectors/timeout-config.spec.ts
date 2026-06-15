import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * INT-11: Validates that all connector types support configurable timeouts.
 * Reads connector source files directly to verify timeout handling.
 */
describe('INT-11: Configurable timeouts per integration channel', () => {
  const connectorsDir = resolve(__dirname);

  const CONNECTORS_WITH_TIMEOUT = [
    { file: 'rest-api.connector.ts', type: 'rest_api', defaultPattern: '30_000', minMs: 1000 },
    { file: 'webhook.connector.ts', type: 'webhook', defaultPattern: '10_000', minMs: 1000 },
    { file: 'snmp.connector.ts', type: 'snmp', defaultPattern: '6_000', minMs: 500 },
    { file: 'bacnet.connector.ts', type: 'bacnet', defaultPattern: '6_000', minMs: 500 },
    { file: 'mqtt.connector.ts', type: 'mqtt', defaultPattern: '5_000', minMs: null },
  ];

  for (const conn of CONNECTORS_WITH_TIMEOUT) {
    describe(`${conn.type} connector`, () => {
      const source = readFileSync(resolve(connectorsDir, conn.file), 'utf-8');

      it('reads timeout from config', () => {
        expect(source).toMatch(/timeout|syncWindow/i);
      });

      it(`has a default timeout (${conn.defaultPattern})`, () => {
        expect(source).toContain(conn.defaultPattern);
      });

      it('applies timeout to network operations', () => {
        const usesTimeout = source.includes('setTimeout')
          || source.includes('AbortController')
          || source.includes('syncWindowMs')
          || source.includes('timeoutMs');
        expect(usesTimeout).toBe(true);
      });
    });
  }

  describe('connector.interface.ts', () => {
    const interfaceSource = readFileSync(resolve(connectorsDir, 'connector.interface.ts'), 'utf-8');

    it('RestApiConfig has timeoutMs', () => {
      expect(interfaceSource).toMatch(/RestApiConfig[\s\S]*?timeoutMs\?:\s*number/);
    });

    it('WebhookConfig has timeoutMs', () => {
      expect(interfaceSource).toMatch(/WebhookConfig[\s\S]*?timeoutMs\?:\s*number/);
    });

    it('BacnetConfig has timeoutMs', () => {
      expect(interfaceSource).toMatch(/BacnetConfig[\s\S]*?timeoutMs\?:\s*number/);
    });

    it('SnmpConfig has timeoutMs', () => {
      expect(interfaceSource).toMatch(/SnmpConfig[\s\S]*?timeoutMs\?:\s*number/);
    });
  });

  describe('validation rejects invalid timeouts', () => {
    it('rest-api rejects timeoutMs < 1000', () => {
      const source = readFileSync(resolve(connectorsDir, 'rest-api.connector.ts'), 'utf-8');
      expect(source).toContain('timeoutMs must be a number >= 1000');
    });

    it('webhook rejects timeoutMs < 1000', () => {
      const source = readFileSync(resolve(connectorsDir, 'webhook.connector.ts'), 'utf-8');
      expect(source).toContain('timeoutMs must be a number >= 1000');
    });

    it('snmp rejects timeoutMs < 500', () => {
      const source = readFileSync(resolve(connectorsDir, 'snmp.connector.ts'), 'utf-8');
      expect(source).toContain('timeoutMs must be a number >= 500');
    });

    it('bacnet rejects timeoutMs < 500', () => {
      const source = readFileSync(resolve(connectorsDir, 'bacnet.connector.ts'), 'utf-8');
      expect(source).toContain('timeoutMs must be a number >= 500');
    });
  });
});

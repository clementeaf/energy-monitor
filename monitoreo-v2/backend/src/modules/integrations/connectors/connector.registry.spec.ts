import { BadRequestException } from '@nestjs/common';
import { ConnectorRegistry } from './connector.registry';
import type { MqttReadingsIngressService } from '../../readings/mqtt-readings-ingress.service';

function mockMqttIngress(): MqttReadingsIngressService {
  return {
    ingestFromMqttMessage: jest.fn().mockResolvedValue(false),
  } as unknown as MqttReadingsIngressService;
}

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;

  beforeEach(() => {
    registry = new ConnectorRegistry(mockMqttIngress());
  });

  describe('get', () => {
    it.each(['rest_api', 'webhook', 'mqtt', 'ftp', 'bacnet', 'snmp'])(
      'returns connector for type "%s"',
      (type) => {
        const connector = registry.get(type);
        expect(connector.type).toBe(type);
        expect(typeof connector.label).toBe('string');
        expect(typeof connector.validateConfig).toBe('function');
        expect(typeof connector.sync).toBe('function');
      },
    );

    it('throws BadRequestException for unknown type', () => {
      expect(() => registry.get('unknown')).toThrow(BadRequestException);
    });

    it('includes supported types in error message', () => {
      try {
        registry.get('invalid');
      } catch (e) {
        expect((e as BadRequestException).message).toContain('rest_api');
        expect((e as BadRequestException).message).toContain('webhook');
        expect((e as BadRequestException).message).toContain('mqtt');
        expect((e as BadRequestException).message).toContain('ftp');
        expect((e as BadRequestException).message).toContain('bacnet');
        expect((e as BadRequestException).message).toContain('snmp');
      }
    });
  });

  describe('has', () => {
    it('returns true for supported types', () => {
      expect(registry.has('rest_api')).toBe(true);
      expect(registry.has('webhook')).toBe(true);
    });

    it('returns false for unsupported types', () => {
      expect(registry.has('unknown')).toBe(false);
    });
  });

  describe('listTypes', () => {
    it('returns all 6 types with labels', () => {
      const types = registry.listTypes();
      expect(types).toHaveLength(6);
      expect(types.map((t) => t.type).sort()).toEqual([
        'bacnet',
        'ftp',
        'mqtt',
        'rest_api',
        'snmp',
        'webhook',
      ]);
      types.forEach((t) => {
        expect(typeof t.label).toBe('string');
        expect(t.label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateConfig', () => {
    it('delegates to the correct connector', () => {
      const errors = registry.validateConfig('rest_api', {});
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('url');
    });

    it('throws for unknown type', () => {
      expect(() => registry.validateConfig('bogus', {})).toThrow(BadRequestException);
    });
  });
});

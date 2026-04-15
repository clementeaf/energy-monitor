import { MqttConnector } from './mqtt.connector';
import type { Integration } from '../../platform/entities/integration.entity';
import { EventEmitter } from 'events';

// Mock mqtt module
const mockClient = new EventEmitter() as EventEmitter & {
  subscribe: jest.Mock;
  end: jest.Mock;
};
mockClient.subscribe = jest.fn();
mockClient.end = jest.fn();

jest.mock('mqtt', () => ({
  connect: jest.fn(() => mockClient),
}));

function makeIntegration(config: Record<string, unknown>): Integration {
  return {
    id: 'int-3',
    tenantId: 't-1',
    name: 'Test MQTT',
    integrationType: 'mqtt',
    status: 'active',
    config,
    lastSyncAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Integration;
}

describe('MqttConnector', () => {
  let connector: MqttConnector;

  beforeEach(() => {
    connector = new MqttConnector(100); // 100ms window for tests
    mockClient.removeAllListeners();
    mockClient.subscribe.mockReset();
    mockClient.end.mockReset();
    mockClient.subscribe.mockImplementation((_topic: string, _opts: unknown, cb: (err: Error | null) => void) => {
      cb(null);
    });
  });

  describe('validateConfig', () => {
    it('requires brokerUrl', () => {
      const errors = connector.validateConfig({});
      expect(errors).toContain('brokerUrl is required and must be a string');
    });

    it('rejects invalid brokerUrl protocol', () => {
      const errors = connector.validateConfig({ brokerUrl: 'http://broker.io', topic: 't' });
      expect(errors).toContain('brokerUrl must use mqtt, mqtts, ws, or wss protocol');
    });

    it('rejects invalid brokerUrl', () => {
      const errors = connector.validateConfig({ brokerUrl: 'not-a-url', topic: 't' });
      expect(errors).toContain('brokerUrl must be a valid URL');
    });

    it('requires topic', () => {
      const errors = connector.validateConfig({ brokerUrl: 'mqtt://broker.io:1883' });
      expect(errors).toContain('topic is required and must be a string');
    });

    it('rejects invalid qos', () => {
      const errors = connector.validateConfig({
        brokerUrl: 'mqtt://broker.io:1883',
        topic: 'test',
        qos: 3,
      });
      expect(errors).toContain('qos must be 0, 1, or 2');
    });

    it('accepts valid minimal config', () => {
      const errors = connector.validateConfig({
        brokerUrl: 'mqtt://broker.io:1883',
        topic: 'energy/readings',
      });
      expect(errors).toHaveLength(0);
    });

    it('accepts valid full config', () => {
      const errors = connector.validateConfig({
        brokerUrl: 'mqtts://broker.io:8883',
        topic: 'energy/#',
        clientId: 'my-client',
        username: 'user',
        password: 'pass',
        qos: 2,
      });
      expect(errors).toHaveLength(0);
    });

    it('rejects non-string clientId', () => {
      const errors = connector.validateConfig({
        brokerUrl: 'mqtt://broker.io:1883',
        topic: 't',
        clientId: 123,
      });
      expect(errors).toContain('clientId must be a string');
    });
  });

  describe('sync', () => {
    it('connects, subscribes, collects messages, and returns success', async () => {
      const promise = connector.sync(
        makeIntegration({
          brokerUrl: 'mqtt://broker.io:1883',
          topic: 'energy/readings',
        }),
      );

      // Simulate connect event
      await new Promise((r) => setImmediate(r));
      mockClient.emit('connect');

      // Simulate messages
      await new Promise((r) => setImmediate(r));
      mockClient.emit('message', 'energy/readings', Buffer.from('msg1'));
      mockClient.emit('message', 'energy/readings', Buffer.from('msg2'));

      const result = await promise;
      expect(result.status).toBe('success');
      expect(result.recordsSynced).toBe(2);
      expect(result.errorMessage).toBeNull();
      expect(mockClient.end).toHaveBeenCalled();
    });

    it('returns success with 0 messages when topic is empty', async () => {
      const promise = connector.sync(
        makeIntegration({
          brokerUrl: 'mqtt://broker.io:1883',
          topic: 'empty/topic',
        }),
      );

      await new Promise((r) => setImmediate(r));
      mockClient.emit('connect');

      const result = await promise;
      expect(result.status).toBe('success');
      expect(result.recordsSynced).toBe(0);
    });

    it('returns failed on connection error', async () => {
      const promise = connector.sync(
        makeIntegration({
          brokerUrl: 'mqtt://broker.io:1883',
          topic: 'test',
        }),
      );

      await new Promise((r) => setImmediate(r));
      mockClient.emit('error', new Error('ECONNREFUSED'));

      const result = await promise;
      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('ECONNREFUSED');
      expect(mockClient.end).toHaveBeenCalled();
    });

    it('returns failed on subscribe error', async () => {
      mockClient.subscribe.mockImplementation((_topic: string, _opts: unknown, cb: (err: Error | null) => void) => {
        cb(new Error('Not authorized'));
      });

      const promise = connector.sync(
        makeIntegration({
          brokerUrl: 'mqtt://broker.io:1883',
          topic: 'restricted/topic',
        }),
      );

      await new Promise((r) => setImmediate(r));
      mockClient.emit('connect');

      const result = await promise;
      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('Not authorized');
    });
  });
});

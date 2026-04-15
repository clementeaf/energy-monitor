describe('config-encryption', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  function loadModule() {
    return require('./config-encryption') as typeof import('./config-encryption');
  }

  describe('when CONFIG_ENCRYPTION_KEY is NOT set', () => {
    it('encryptConfig returns config unchanged', () => {
      delete process.env.CONFIG_ENCRYPTION_KEY;
      const { encryptConfig } = loadModule();
      const config = { url: 'https://api.com', auth: { type: 'bearer', token: 'secret123' } };
      const result = encryptConfig(config);
      expect(result).toEqual(config);
    });

    it('decryptConfig returns config unchanged', () => {
      delete process.env.CONFIG_ENCRYPTION_KEY;
      const { decryptConfig } = loadModule();
      const config = { url: 'https://api.com', auth: { token: 'plain' } };
      const result = decryptConfig(config);
      expect(result).toEqual(config);
    });
  });

  describe('when CONFIG_ENCRYPTION_KEY is set', () => {
    const KEY = 'test-encryption-key-32-chars-ok!';

    it('encrypts sensitive fields (token, password, apiKey, secret)', () => {
      process.env.CONFIG_ENCRYPTION_KEY = KEY;
      const { encryptConfig } = loadModule();
      const config = {
        url: 'https://api.com',
        auth: {
          type: 'bearer',
          token: 'my-secret-token',
          password: 'my-password',
          apiKey: 'key-123',
        },
        secret: 'webhook-secret',
      };

      const encrypted = encryptConfig(config);

      // Non-sensitive fields unchanged
      expect(encrypted.url).toBe('https://api.com');
      const auth = encrypted.auth as Record<string, unknown>;
      expect(auth.type).toBe('bearer');

      // Sensitive fields encrypted
      expect(auth.token).not.toBe('my-secret-token');
      expect((auth.token as string).startsWith('enc:')).toBe(true);
      expect((auth.password as string).startsWith('enc:')).toBe(true);
      expect((auth.apiKey as string).startsWith('enc:')).toBe(true);
      expect((encrypted.secret as string).startsWith('enc:')).toBe(true);
    });

    it('decrypt reverses encrypt (round-trip)', () => {
      process.env.CONFIG_ENCRYPTION_KEY = KEY;
      const { encryptConfig, decryptConfig } = loadModule();
      const config = {
        url: 'https://api.com',
        auth: { type: 'bearer', token: 'secret-value' },
        password: 'db-pass',
      };

      const encrypted = encryptConfig(config);
      const decrypted = decryptConfig(encrypted);

      expect(decrypted).toEqual(config);
    });

    it('does not double-encrypt already encrypted values', () => {
      process.env.CONFIG_ENCRYPTION_KEY = KEY;
      const { encryptConfig } = loadModule();
      const config = { auth: { token: 'plaintext' } };

      const first = encryptConfig(config);
      const second = encryptConfig(first);

      // Token should still start with enc: (not enc:enc:)
      const auth = second.auth as Record<string, unknown>;
      const parts = (auth.token as string).split(':');
      expect(parts[0]).toBe('enc');
      expect(parts.length).toBe(4);
    });

    it('fails to decrypt with wrong key', () => {
      process.env.CONFIG_ENCRYPTION_KEY = KEY;
      const { encryptConfig } = loadModule();
      const config = { auth: { token: 'secret' } };
      const encrypted = encryptConfig(config);

      // Change key
      process.env.CONFIG_ENCRYPTION_KEY = 'different-key-will-fail!!!!!!!!';
      jest.resetModules();
      const { decryptConfig } = require('./config-encryption') as typeof import('./config-encryption');

      expect(() => decryptConfig(encrypted)).toThrow();
    });

    it('preserves arrays and non-object values', () => {
      process.env.CONFIG_ENCRYPTION_KEY = KEY;
      const { encryptConfig } = loadModule();
      const config = {
        events: ['reading.new', 'alert.created'],
        port: 1883,
        enabled: true,
        auth: { token: 'secret' },
      };

      const encrypted = encryptConfig(config);
      expect(encrypted.events).toEqual(['reading.new', 'alert.created']);
      expect(encrypted.port).toBe(1883);
      expect(encrypted.enabled).toBe(true);
    });
  });
});

describe('validateEnv', () => {
  const ORIGINAL_ENV = process.env;
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    mockExit?.mockRestore();
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
    mockExit.mockRestore();
  });

  function loadValidateEnv() {
    return (require('./env-validation') as typeof import('./env-validation')).validateEnv;
  }

  it('does nothing when all vars are set', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a]ecure-jwt-secret-with-32-chars!';
    process.env.COOKIE_SECRET = 'cookie';
    process.env.FRONTEND_URL = 'https://app.com';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PASSWORD = 'pass';
    process.env.MICROSOFT_TENANT_ID = 'tid';
    process.env.MICROSOFT_CLIENT_ID = 'mcid';
    process.env.GOOGLE_CLIENT_ID = 'gcid';

    const validateEnv = loadValidateEnv();
    validateEnv();

    expect(mockExit).not.toHaveBeenCalled();
  });

  it('exits in production when JWT_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_SECRET = 'cookie';
    process.env.FRONTEND_URL = 'https://app.com';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PASSWORD = 'pass';
    delete process.env.JWT_SECRET;

    const validateEnv = loadValidateEnv();
    validateEnv();

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('does NOT exit in development when vars are missing', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    delete process.env.COOKIE_SECRET;

    const validateEnv = loadValidateEnv();
    validateEnv();

    expect(mockExit).not.toHaveBeenCalled();
  });

  it('exits in production when JWT_SECRET is too short', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short';
    process.env.COOKIE_SECRET = 'cookie';
    process.env.FRONTEND_URL = 'https://app.com';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PASSWORD = 'pass';
    process.env.MICROSOFT_TENANT_ID = 'tid';
    process.env.MICROSOFT_CLIENT_ID = 'mcid';
    process.env.GOOGLE_CLIENT_ID = 'gcid';

    const validateEnv = loadValidateEnv();
    validateEnv();

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits when multiple vars missing in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    delete process.env.COOKIE_SECRET;
    delete process.env.FRONTEND_URL;
    delete process.env.DB_HOST;
    delete process.env.DB_PASSWORD;

    const validateEnv = loadValidateEnv();
    validateEnv();

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

import { validateExternalUrl } from './url-validator';

describe('validateExternalUrl (SSRF protection)', () => {
  /* --- Blocked --- */

  it('blocks localhost', () => {
    expect(validateExternalUrl('http://localhost/admin')).toContain('Blocked');
  });

  it('blocks 127.0.0.1', () => {
    expect(validateExternalUrl('http://127.0.0.1/')).toContain('Blocked');
  });

  it('blocks 127.x.x.x range', () => {
    expect(validateExternalUrl('http://127.0.0.2:8080/')).toContain('Blocked');
  });

  it('blocks AWS metadata endpoint', () => {
    expect(validateExternalUrl('http://169.254.169.254/latest/meta-data/')).toContain('Blocked');
  });

  it('blocks link-local range', () => {
    expect(validateExternalUrl('http://169.254.1.1/')).toContain('Blocked');
  });

  it('blocks 10.x.x.x private range', () => {
    expect(validateExternalUrl('http://10.0.0.1/')).toContain('Blocked');
  });

  it('blocks 172.16.x.x private range', () => {
    expect(validateExternalUrl('http://172.16.0.1/')).toContain('Blocked');
  });

  it('blocks 192.168.x.x private range', () => {
    expect(validateExternalUrl('http://192.168.1.1/')).toContain('Blocked');
  });

  it('blocks PostgreSQL port', () => {
    expect(validateExternalUrl('http://external.com:5432/')).toContain('Blocked');
  });

  it('blocks Redis port', () => {
    expect(validateExternalUrl('http://external.com:6379/')).toContain('Blocked');
  });

  it('blocks MySQL port', () => {
    expect(validateExternalUrl('http://external.com:3306/')).toContain('Blocked');
  });

  it('blocks file:// protocol', () => {
    expect(validateExternalUrl('file:///etc/passwd')).toContain('Blocked');
  });

  it('blocks ftp:// protocol', () => {
    expect(validateExternalUrl('ftp://server.com/')).toContain('Blocked');
  });

  it('blocks Google metadata endpoint', () => {
    expect(validateExternalUrl('http://metadata.google.internal/')).toContain('Blocked');
  });

  it('returns error for invalid URL', () => {
    expect(validateExternalUrl('not-a-url')).toBe('Invalid URL format');
  });

  /* --- Allowed --- */

  it('allows public HTTPS URL', () => {
    expect(validateExternalUrl('https://api.example.com/data')).toBeNull();
  });

  it('allows public HTTP URL', () => {
    expect(validateExternalUrl('http://api.example.com/webhook')).toBeNull();
  });

  it('allows public IP on standard port', () => {
    expect(validateExternalUrl('https://8.8.8.8/')).toBeNull();
  });

  it('allows URL with custom non-blocked port', () => {
    expect(validateExternalUrl('https://api.example.com:8443/data')).toBeNull();
  });
});

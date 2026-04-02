import { describe, it, expect } from 'vitest';
import {
  buildContentSecurityPolicy,
  escapeHtmlAttr,
  originFromApiBaseUrl,
} from './csp-policy.ts';

describe('originFromApiBaseUrl', () => {
  it('returns undefined for relative paths', () => {
    expect(originFromApiBaseUrl('/api')).toBeUndefined();
    expect(originFromApiBaseUrl(undefined)).toBeUndefined();
  });

  it('returns origin for absolute URL', () => {
    expect(originFromApiBaseUrl('https://api.example.com/v1')).toBe(
      'https://api.example.com',
    );
  });
});

describe('escapeHtmlAttr', () => {
  it('escapes quotes and ampersands', () => {
    expect(escapeHtmlAttr('a&b"c')).toBe('a&amp;b&quot;c');
  });
});

describe('buildContentSecurityPolicy', () => {
  it('includes default connect sources and self', () => {
    const csp = buildContentSecurityPolicy({});
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('connect-src');
    expect(csp).toContain('https://login.microsoftonline.com');
    expect(csp).toContain('upgrade-insecure-requests');
    expect(csp).toContain("object-src 'none'");
  });

  it('merges extra connect origins', () => {
    const csp = buildContentSecurityPolicy({
      VITE_CSP_EXTRA_CONNECT: 'https://foo.example, https://bar.example',
    });
    expect(csp).toContain('https://bar.example');
    expect(csp).toContain('https://foo.example');
  });

  it('adds API origin when VITE_API_BASE_URL is absolute', () => {
    const csp = buildContentSecurityPolicy({
      VITE_API_BASE_URL: 'https://custom.api.com/prod/api',
    });
    expect(csp).toContain('https://custom.api.com');
  });
});

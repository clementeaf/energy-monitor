import { describe, it, expect } from 'vitest';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getFetchErrorKind, getFetchErrorMessage } from './fetchError';

const emptyConfig = {} as InternalAxiosRequestConfig;

describe('getFetchErrorKind', () => {
  it('returns network when no response and ERR_NETWORK', () => {
    const err = new AxiosError('x', 'ERR_NETWORK', emptyConfig);
    expect(getFetchErrorKind(err)).toBe('network');
  });

  it('returns server for 503', () => {
    const err = new AxiosError('x', 'ERR_BAD_RESPONSE', emptyConfig, undefined, {
      status: 503,
      statusText: 'Service Unavailable',
      data: {},
      headers: {},
      config: emptyConfig,
    });
    expect(getFetchErrorKind(err)).toBe('server');
  });

  it('returns client for 404', () => {
    const err = new AxiosError('x', 'ERR_BAD_REQUEST', emptyConfig, undefined, {
      status: 404,
      statusText: 'Not Found',
      data: {},
      headers: {},
      config: emptyConfig,
    });
    expect(getFetchErrorKind(err)).toBe('client');
  });

  it('returns unknown for non-axios', () => {
    expect(getFetchErrorKind(new Error('boom'))).toBe('unknown');
  });
});

describe('getFetchErrorMessage', () => {
  it('returns network copy for ERR_NETWORK', () => {
    const err = new AxiosError('x', 'ERR_NETWORK', emptyConfig);
    expect(getFetchErrorMessage(err)).toContain('conectar');
  });
});

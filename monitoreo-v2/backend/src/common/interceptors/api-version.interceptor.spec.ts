import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import {
  ApiVersionInterceptor,
  API_VERSION,
  ApiDeprecated,
  DEPRECATION_KEY,
} from './api-version.interceptor';

describe('ApiVersionInterceptor', () => {
  let interceptor: ApiVersionInterceptor;
  let reflector: { get: jest.Mock };
  let headers: Record<string, string>;
  let mockContext: ExecutionContext;
  let mockHandler: CallHandler;

  beforeEach(() => {
    reflector = { get: jest.fn().mockReturnValue(undefined) };
    interceptor = new ApiVersionInterceptor(reflector as unknown as Reflector);

    headers = {};
    const mockResponse = {
      setHeader: jest.fn((key: string, value: string) => { headers[key] = value; }),
    };

    mockContext = {
      switchToHttp: () => ({ getResponse: () => mockResponse }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    mockHandler = { handle: () => of({ data: 'test' }) };
  });

  it('sets API-Version header on every response', (done) => {
    interceptor.intercept(mockContext, mockHandler).subscribe(() => {
      expect(headers['API-Version']).toBe(API_VERSION);
      done();
    });
  });

  it('API_VERSION constant matches expected value', () => {
    expect(API_VERSION).toBe('1.0');
  });

  it('does not set Deprecation headers on normal endpoints', (done) => {
    interceptor.intercept(mockContext, mockHandler).subscribe(() => {
      expect(headers['Deprecation']).toBeUndefined();
      expect(headers['Sunset']).toBeUndefined();
      done();
    });
  });

  it('sets Deprecation header for deprecated endpoints', (done) => {
    reflector.get.mockReturnValue({});
    interceptor.intercept(mockContext, mockHandler).subscribe(() => {
      expect(headers['Deprecation']).toBe('true');
      done();
    });
  });

  it('sets Sunset header when sunset date provided', (done) => {
    reflector.get.mockReturnValue({ sunset: '2027-06-15' });
    interceptor.intercept(mockContext, mockHandler).subscribe(() => {
      expect(headers['Deprecation']).toBe('true');
      expect(headers['Sunset']).toBe('2027-06-15');
      done();
    });
  });

  it('sets X-Deprecation-Notice when notice provided', (done) => {
    reflector.get.mockReturnValue({
      sunset: '2027-01-01',
      notice: 'Use v2 endpoint instead',
    });
    interceptor.intercept(mockContext, mockHandler).subscribe(() => {
      expect(headers['X-Deprecation-Notice']).toBe('Use v2 endpoint instead');
      done();
    });
  });

  it('reads deprecation metadata from handler', () => {
    reflector.get.mockReturnValue(undefined);
    interceptor.intercept(mockContext, mockHandler).subscribe();
    expect(reflector.get).toHaveBeenCalledWith(
      DEPRECATION_KEY,
      mockContext.getHandler(),
    );
  });
});

describe('ApiDeprecated decorator', () => {
  it('attaches deprecation metadata to method', () => {
    class TestController {
      @ApiDeprecated({ sunset: '2027-06-15', notice: 'Use v2' })
      handler() { return; }
    }

    const meta = Reflect.getMetadata(DEPRECATION_KEY, TestController.prototype.handler);
    expect(meta).toEqual({ sunset: '2027-06-15', notice: 'Use v2' });
  });

  it('attaches empty metadata when no args', () => {
    class TestController {
      @ApiDeprecated()
      handler() { return; }
    }

    const meta = Reflect.getMetadata(DEPRECATION_KEY, TestController.prototype.handler);
    expect(meta).toEqual({});
  });
});

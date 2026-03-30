import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Tests for the @Public() check in JwtAuthGuard.
 * We test the logic directly rather than instantiating the guard,
 * because AuthGuard('jwt') requires a registered passport strategy
 * which crashes the worker in unit tests.
 */
describe('JwtAuthGuard @Public() logic', () => {
  it('detects @Public() metadata via reflector', () => {
    const reflector = new Reflector();

    // Simulate handler with @Public()
    const handler = () => {};
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);

    const result = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler]);
    expect(result).toBe(true);
  });

  it('returns falsy when @Public() is not set', () => {
    const reflector = new Reflector();
    const handler = () => {};

    const result = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler]);
    expect(result).toBeFalsy();
  });
});

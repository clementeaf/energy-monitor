import { withRetry } from './retry.util';

describe('withRetry', () => {
  it('returns on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 2, delayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 2, delayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('persistent'));
    await expect(withRetry(fn, { maxRetries: 2, delayMs: 1 })).rejects.toThrow('persistent');
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('wraps non-Error throws', async () => {
    const fn = jest.fn().mockRejectedValue('string-error');
    await expect(withRetry(fn, { maxRetries: 0, delayMs: 1 })).rejects.toThrow('string-error');
  });

  it('uses linear delay when backoff is false', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const start = Date.now();
    await withRetry(fn, { maxRetries: 1, delayMs: 50, backoff: false });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(elapsed).toBeLessThan(200);
  });

  it('defaults to maxRetries=2 when no options', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, { delayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

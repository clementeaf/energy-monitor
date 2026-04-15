export interface RetryOptions {
  /** Max number of retries after first failure. Default: 2 (3 total attempts). */
  maxRetries?: number;
  /** Base delay between retries in ms. Default: 1000. */
  delayMs?: number;
  /** Use exponential backoff. Default: true. */
  backoff?: boolean;
}

/**
 * Execute `fn` with automatic retries and optional exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 2, delayMs = 1000, backoff = true } = opts;
  let lastError: Error = new Error('withRetry: no attempts made');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const wait = backoff ? delayMs * Math.pow(2, attempt) : delayMs;
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }

  throw lastError;
}

// File path: packages/utils/src/retry.ts


/**
 * Retries a given async function based on specified options.
 * @param fn - The async function to retry.
 * @param options - Retry options.
 */
export async function retry<T>(fn: () => Promise<T>, options: { retries: number; delay: number }): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (error) {
        attempt++;
        if (attempt > options.retries) {
          throw error;
        }
        await new Promise(res => setTimeout(res, options.delay));
      }
    }
  }
  
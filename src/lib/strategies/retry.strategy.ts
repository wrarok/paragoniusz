/**
 * Interface for retry strategies
 *
 * Defines the contract for implementing different retry behaviors.
 * Allows for Strategy Pattern - easy to swap different retry implementations.
 */
export interface RetryStrategy {
  /**
   * Determines if an error should be retried
   * @param error - The error that occurred
   * @param attempt - Current attempt number (0-indexed)
   * @returns true if should retry, false otherwise
   */
  shouldRetry(error: Error, attempt: number): boolean;

  /**
   * Calculates delay before next retry attempt
   * @param attempt - Current attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  getDelay(attempt: number): number;
}

/**
 * Exponential backoff retry strategy
 *
 * Implements exponential backoff with configurable parameters.
 * Does not retry for certain error types (auth, validation, timeout).
 *
 * Formula: delay = baseDelay * (2 ^ attempt)
 * Example: 1000ms, 2000ms, 4000ms, 8000ms...
 *
 * @example
 * ```typescript
 * const strategy = new ExponentialBackoffStrategy(3, 1000);
 *
 * // Check if should retry
 * if (strategy.shouldRetry(error, 0)) {
 *   const delay = strategy.getDelay(0); // 1000ms
 *   await new Promise(resolve => setTimeout(resolve, delay));
 *   // retry operation
 * }
 * ```
 */
export class ExponentialBackoffStrategy implements RetryStrategy {
  /**
   * Creates a new exponential backoff strategy
   *
   * @param maxAttempts - Maximum number of retry attempts (default: 3)
   * @param baseDelay - Base delay in milliseconds (default: 1000)
   * @param nonRetryableErrors - Set of error names that should not be retried
   */
  constructor(
    private maxAttempts = 3,
    private baseDelay = 1000,
    private nonRetryableErrors: Set<string> = new Set(["AuthenticationError", "ValidationError", "TimeoutError"])
  ) {}

  /**
   * Determine if error should be retried
   *
   * Checks:
   * 1. If max attempts reached
   * 2. If error type is non-retryable
   *
   * @param error - The error that occurred
   * @param attempt - Current attempt number (0-indexed)
   * @returns true if should retry, false otherwise
   */
  shouldRetry(error: Error, attempt: number): boolean {
    // Don't retry if we've exhausted attempts
    if (attempt >= this.maxAttempts - 1) {
      return false;
    }

    // Don't retry certain error types
    if (this.nonRetryableErrors.has(error.constructor.name)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate delay for retry attempt using exponential backoff
   *
   * Formula: baseDelay * (2 ^ attempt)
   *
   * @param attempt - Current attempt number (0-indexed)
   * @returns Delay in milliseconds
   *
   * @example
   * ```typescript
   * strategy.getDelay(0); // 1000ms
   * strategy.getDelay(1); // 2000ms
   * strategy.getDelay(2); // 4000ms
   * strategy.getDelay(3); // 8000ms
   * ```
   */
  getDelay(attempt: number): number {
    return this.baseDelay * Math.pow(2, attempt);
  }
}

/**
 * Helper function to execute operation with retry logic
 *
 * Wraps any async operation with retry behavior based on provided strategy.
 * Automatically handles delays between retries.
 *
 * @template T - Return type of the operation
 * @param operation - Async operation to execute
 * @param strategy - Retry strategy to use
 * @returns Promise resolving to operation result
 * @throws Last error if all retries fail
 *
 * @example
 * ```typescript
 * const strategy = new ExponentialBackoffStrategy(3);
 *
 * const result = await withRetry(
 *   async () => await fetchData(),
 *   strategy
 * );
 * ```
 */
export async function withRetry<T>(operation: () => Promise<T>, strategy: RetryStrategy): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (!strategy.shouldRetry(lastError, attempt)) {
        throw error;
      }

      const delay = strategy.getDelay(attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached due to maxAttempts check in shouldRetry
  throw lastError || new Error("Unknown error in retry logic");
}

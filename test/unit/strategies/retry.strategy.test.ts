import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExponentialBackoffStrategy, withRetry, type RetryStrategy } from "../../../src/lib/strategies/retry.strategy";

/**
 * Unit tests for Retry Strategy
 *
 * Tests cover:
 * - ExponentialBackoffStrategy.shouldRetry() with various scenarios
 * - ExponentialBackoffStrategy.getDelay() exponential calculation
 * - withRetry() helper function with success/failure cases
 * - Non-retryable error types
 * - Max attempts handling
 */
describe("RetryStrategy", () => {
  describe("ExponentialBackoffStrategy", () => {
    describe("constructor()", () => {
      it("should create strategy with default parameters", () => {
        // Act
        const strategy = new ExponentialBackoffStrategy();

        // Assert - verify defaults by testing behavior
        const genericError = new Error("Generic error");
        expect(strategy.shouldRetry(genericError, 0)).toBe(true); // maxAttempts default: 3
        expect(strategy.shouldRetry(genericError, 2)).toBe(false); // attempt 2 >= maxAttempts-1
        expect(strategy.getDelay(0)).toBe(1000); // baseDelay default: 1000
      });

      it("should create strategy with custom maxAttempts", () => {
        // Arrange
        const maxAttempts = 5;

        // Act
        const strategy = new ExponentialBackoffStrategy(maxAttempts);

        // Assert
        const genericError = new Error("Generic error");
        expect(strategy.shouldRetry(genericError, 3)).toBe(true);
        expect(strategy.shouldRetry(genericError, 4)).toBe(false); // attempt 4 >= maxAttempts-1
      });

      it("should create strategy with custom baseDelay", () => {
        // Arrange
        const maxAttempts = 3;
        const baseDelay = 2000;

        // Act
        const strategy = new ExponentialBackoffStrategy(maxAttempts, baseDelay);

        // Assert
        expect(strategy.getDelay(0)).toBe(2000);
        expect(strategy.getDelay(1)).toBe(4000);
      });

      it("should create strategy with custom non-retryable errors", () => {
        // Arrange
        class CustomNonRetryableError extends Error {
          name = "CustomNonRetryableError";
        }
        const nonRetryableErrors = new Set(["CustomNonRetryableError"]);

        // Act
        const strategy = new ExponentialBackoffStrategy(3, 1000, nonRetryableErrors);

        // Assert
        const customError = new CustomNonRetryableError("Custom error");
        expect(strategy.shouldRetry(customError, 0)).toBe(false);
      });
    });

    describe("shouldRetry()", () => {
      let strategy: ExponentialBackoffStrategy;

      beforeEach(() => {
        strategy = new ExponentialBackoffStrategy(3, 1000);
      });

      it("should return true for retryable error on first attempt", () => {
        // Arrange
        const error = new Error("Network error");
        const attempt = 0;

        // Act
        const result = strategy.shouldRetry(error, attempt);

        // Assert
        expect(result).toBe(true);
      });

      it("should return true for retryable error on second attempt", () => {
        // Arrange
        const error = new Error("Network error");
        const attempt = 1;

        // Act
        const result = strategy.shouldRetry(error, attempt);

        // Assert
        expect(result).toBe(true);
      });

      it("should return false when max attempts reached", () => {
        // Arrange
        const error = new Error("Network error");
        const attempt = 2; // maxAttempts = 3, so attempt 2 is the last

        // Act
        const result = strategy.shouldRetry(error, attempt);

        // Assert
        expect(result).toBe(false);
      });

      it("should return false for AuthenticationError", () => {
        // Arrange
        class AuthenticationError extends Error {
          name = "AuthenticationError";
        }
        const error = new AuthenticationError("Auth failed");
        const attempt = 0;

        // Act
        const result = strategy.shouldRetry(error, attempt);

        // Assert
        expect(result).toBe(false);
      });

      it("should return false for ValidationError", () => {
        // Arrange
        class ValidationError extends Error {
          name = "ValidationError";
        }
        const error = new ValidationError("Validation failed");
        const attempt = 0;

        // Act
        const result = strategy.shouldRetry(error, attempt);

        // Assert
        expect(result).toBe(false);
      });

      it("should return false for TimeoutError", () => {
        // Arrange
        class TimeoutError extends Error {
          name = "TimeoutError";
        }
        const error = new TimeoutError("Request timeout");
        const attempt = 0;

        // Act
        const result = strategy.shouldRetry(error, attempt);

        // Assert
        expect(result).toBe(false);
      });

      it("should return true for generic Error (retryable)", () => {
        // Arrange
        const error = new Error("Network failure");
        const attempt = 0;

        // Act
        const result = strategy.shouldRetry(error, attempt);

        // Assert
        expect(result).toBe(true);
      });

      it("should return true for custom retryable error", () => {
        // Arrange
        class NetworkError extends Error {
          name = "NetworkError";
        }
        const error = new NetworkError("Connection lost");
        const attempt = 0;

        // Act
        const result = strategy.shouldRetry(error, attempt);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe("getDelay()", () => {
      it("should calculate exponential backoff with default baseDelay (1000ms)", () => {
        // Arrange
        const strategy = new ExponentialBackoffStrategy(3, 1000);

        // Act & Assert
        expect(strategy.getDelay(0)).toBe(1000); // 1000 * 2^0 = 1000
        expect(strategy.getDelay(1)).toBe(2000); // 1000 * 2^1 = 2000
        expect(strategy.getDelay(2)).toBe(4000); // 1000 * 2^2 = 4000
        expect(strategy.getDelay(3)).toBe(8000); // 1000 * 2^3 = 8000
      });

      it("should calculate exponential backoff with custom baseDelay (500ms)", () => {
        // Arrange
        const strategy = new ExponentialBackoffStrategy(3, 500);

        // Act & Assert
        expect(strategy.getDelay(0)).toBe(500); // 500 * 2^0 = 500
        expect(strategy.getDelay(1)).toBe(1000); // 500 * 2^1 = 1000
        expect(strategy.getDelay(2)).toBe(2000); // 500 * 2^2 = 2000
        expect(strategy.getDelay(3)).toBe(4000); // 500 * 2^3 = 4000
      });

      it("should calculate exponential backoff with custom baseDelay (2000ms)", () => {
        // Arrange
        const strategy = new ExponentialBackoffStrategy(3, 2000);

        // Act & Assert
        expect(strategy.getDelay(0)).toBe(2000); // 2000 * 2^0 = 2000
        expect(strategy.getDelay(1)).toBe(4000); // 2000 * 2^1 = 4000
        expect(strategy.getDelay(2)).toBe(8000); // 2000 * 2^2 = 8000
      });

      it("should handle attempt 0", () => {
        // Arrange
        const strategy = new ExponentialBackoffStrategy(3, 1000);

        // Act
        const delay = strategy.getDelay(0);

        // Assert
        expect(delay).toBe(1000); // 2^0 = 1
      });
    });
  });

  describe("withRetry()", () => {
    let strategy: RetryStrategy;

    beforeEach(() => {
      strategy = new ExponentialBackoffStrategy(3, 100); // Short delays for tests
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it("should return result on first successful attempt", async () => {
      // Arrange
      const expectedResult = { data: "success" };
      const operation = vi.fn().mockResolvedValue(expectedResult);

      // Act
      const promise = withRetry(operation, strategy);
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result).toEqual(expectedResult);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and succeed on second attempt", async () => {
      // Arrange
      const expectedResult = { data: "success" };
      const operation = vi.fn().mockRejectedValueOnce(new Error("First failure")).mockResolvedValueOnce(expectedResult);

      // Act
      const promise = withRetry(operation, strategy);
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result).toEqual(expectedResult);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should retry on failure and succeed on third attempt", async () => {
      // Arrange
      const expectedResult = { data: "success" };
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockRejectedValueOnce(new Error("Second failure"))
        .mockResolvedValueOnce(expectedResult);

      // Act
      const promise = withRetry(operation, strategy);
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result).toEqual(expectedResult);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should throw error after max attempts exhausted", async () => {
      // Arrange
      const error = new Error("Persistent failure");
      const operation = vi.fn().mockRejectedValue(error);

      // Act & Assert
      const promise = withRetry(operation, strategy);
      const expectation = expect(promise).rejects.toThrow("Persistent failure");
      await vi.runAllTimersAsync();
      await expectation;

      expect(operation).toHaveBeenCalledTimes(3); // maxAttempts = 3
    });

    it("should not retry non-retryable error (AuthenticationError)", async () => {
      // Arrange
      class AuthenticationError extends Error {
        name = "AuthenticationError";
      }
      const error = new AuthenticationError("Auth failed");
      const operation = vi.fn().mockRejectedValue(error);

      // Act & Assert
      const promise = withRetry(operation, strategy);
      const expectation = expect(promise).rejects.toThrow("Auth failed");
      await vi.runAllTimersAsync();
      await expectation;

      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it("should not retry non-retryable error (ValidationError)", async () => {
      // Arrange
      class ValidationError extends Error {
        name = "ValidationError";
      }
      const error = new ValidationError("Validation failed");
      const operation = vi.fn().mockRejectedValue(error);

      // Act & Assert
      const promise = withRetry(operation, strategy);
      const expectation = expect(promise).rejects.toThrow("Validation failed");
      await vi.runAllTimersAsync();
      await expectation;

      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it("should not retry non-retryable error (TimeoutError)", async () => {
      // Arrange
      class TimeoutError extends Error {
        name = "TimeoutError";
      }
      const error = new TimeoutError("Request timeout");
      const operation = vi.fn().mockRejectedValue(error);

      // Act & Assert
      const promise = withRetry(operation, strategy);
      const expectation = expect(promise).rejects.toThrow("Request timeout");
      await vi.runAllTimersAsync();
      await expectation;

      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it("should wait with exponential backoff between retries", async () => {
      // Arrange
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockRejectedValueOnce(new Error("Second failure"))
        .mockResolvedValueOnce({ data: "success" });

      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      // Act
      const promise = withRetry(operation, strategy);
      await vi.runAllTimersAsync();
      await promise;

      // Assert
      expect(setTimeoutSpy).toHaveBeenCalledTimes(2); // 2 delays (for 2 retries)
      // First retry: 100ms * 2^0 = 100ms
      // Second retry: 100ms * 2^1 = 200ms
    });

    it("should handle operation that throws non-Error object", async () => {
      // Arrange
      const operation = vi.fn().mockRejectedValue("String error");

      // Act & Assert
      const promise = withRetry(operation, strategy);
      const expectation = expect(promise).rejects.toBe("String error");
      await vi.runAllTimersAsync();
      await expectation;
    });

    it("should work with async operation that resolves immediately", async () => {
      // Arrange
      const operation = vi.fn().mockResolvedValue(42);

      // Act
      const promise = withRetry(operation, strategy);
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result).toBe(42);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should work with custom retry strategy", async () => {
      // Arrange
      const customStrategy: RetryStrategy = {
        shouldRetry: (error, attempt) => attempt < 2, // Max 2 retries
        getDelay: (attempt) => 50, // Fixed 50ms delay
      };

      const operation = vi.fn().mockRejectedValue(new Error("Failure"));

      // Act & Assert
      const promise = withRetry(operation, customStrategy);
      const expectation = expect(promise).rejects.toThrow("Failure");
      await vi.runAllTimersAsync();
      await expectation;

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});

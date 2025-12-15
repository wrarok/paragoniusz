/**
 * OpenRouter Service Error Classes
 *
 * Custom error classes for handling different types of errors that can occur
 * when interacting with the OpenRouter API.
 */

/**
 * Base error class for all OpenRouter-related errors
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "OpenRouterError";

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Network-related errors (connection failures, DNS issues, etc.)
 */
export class NetworkError extends OpenRouterError {
  constructor(message = "Network request failed") {
    super(message, "NETWORK_ERROR");
    this.name = "NetworkError";
  }
}

/**
 * Request timeout errors (exceeds configured timeout limit)
 */
export class TimeoutError extends OpenRouterError {
  constructor(message = "Request timeout after 20 seconds") {
    super(message, "TIMEOUT_ERROR");
    this.name = "TimeoutError";
  }
}

/**
 * Authentication errors (invalid API key, expired credentials, etc.)
 */
export class AuthenticationError extends OpenRouterError {
  constructor(message = "Invalid API key") {
    super(message, "AUTH_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Rate limit errors (too many requests)
 */
export class RateLimitError extends OpenRouterError {
  constructor(message = "Rate limit exceeded") {
    super(message, "RATE_LIMIT_ERROR", 429);
    this.name = "RateLimitError";
  }
}

/**
 * Validation errors (invalid request format, schema validation failures, etc.)
 */
export class ValidationError extends OpenRouterError {
  constructor(
    message: string,
    public readonly validationErrors?: unknown
  ) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

/**
 * API errors (server errors, model unavailable, etc.)
 */
export class APIError extends OpenRouterError {
  constructor(message: string, statusCode: number) {
    super(message, "API_ERROR", statusCode);
    this.name = "APIError";
  }
}

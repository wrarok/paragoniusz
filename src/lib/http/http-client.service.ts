/**
 * HTTP Client Service with timeout support
 * 
 * Provides abstraction over fetch API with:
 * - Timeout management using AbortController
 * - JSON parsing
 * - Error handling
 * - Type-safe request/response handling
 * 
 * This abstraction makes it easy to:
 * - Mock HTTP calls in tests
 * - Reuse timeout logic across services
 * - Centralize HTTP error handling
 */
export class HTTPClientService {
  /**
   * POST request with timeout
   * 
   * Executes a POST request with automatic timeout using AbortController.
   * Throws on non-2xx responses or timeout.
   * 
   * @template T - Expected response type
   * @param url - Target URL
   * @param body - Request body (will be JSON stringified)
   * @param timeout - Timeout in milliseconds
   * @param headers - Optional additional headers
   * @returns Promise resolving to parsed JSON response
   * @throws {Error} On timeout (AbortError) or non-2xx response
   * 
   * @example
   * ```typescript
   * const client = new HTTPClientService();
   * const response = await client.postWithTimeout<ApiResponse>(
   *   'https://api.example.com/endpoint',
   *   { key: 'value' },
   *   5000,
   *   { 'Authorization': 'Bearer token' }
   * );
   * ```
   */
  async postWithTimeout<T>(
    url: string,
    body: unknown,
    timeout: number,
    headers?: Record<string, string>
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      // Convert AbortError to meaningful timeout error
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('REQUEST_TIMEOUT');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * POST request without timeout
   * 
   * Executes a standard POST request without timeout constraints.
   * Useful for long-running operations.
   * 
   * @template T - Expected response type
   * @param url - Target URL
   * @param body - Request body (will be JSON stringified)
   * @param headers - Optional additional headers
   * @returns Promise resolving to parsed JSON response
   * @throws {Error} On non-2xx response
   * 
   * @example
   * ```typescript
   * const client = new HTTPClientService();
   * const response = await client.post<ApiResponse>(
   *   'https://api.example.com/endpoint',
   *   { key: 'value' },
   *   { 'Authorization': 'Bearer token' }
   * );
   * ```
   */
  async post<T>(
    url: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }
}
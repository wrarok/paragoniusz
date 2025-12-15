import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HTTPClientService } from "../../../src/lib/http/http-client.service";

/**
 * Unit tests for HTTPClientService
 *
 * Tests cover:
 * - postWithTimeout() method with success, timeout, and error cases
 * - post() method with success and error cases
 * - HTTP error handling (400, 401, 404, 500)
 * - Timeout management with AbortController
 * - Custom headers handling
 * - JSON parsing
 */
describe("HTTPClientService", () => {
  let httpClient: HTTPClientService;

  beforeEach(() => {
    httpClient = new HTTPClientService();

    // Mock setTimeout to avoid actual delays in tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("postWithTimeout()", () => {
    it("should make successful POST request with timeout", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const responseData = { result: "success" };
      const timeout = 5000;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => responseData,
      });
      global.fetch = mockFetch as any;

      // Act
      const result = await httpClient.postWithTimeout(url, requestBody, timeout);

      // Assert
      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: expect.any(AbortSignal),
      });
    });

    it("should include custom headers in request", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const customHeaders = {
        Authorization: "Bearer token123",
        "X-Custom-Header": "custom-value",
      };
      const timeout = 5000;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch as any;

      // Act
      await httpClient.postWithTimeout(url, requestBody, timeout, customHeaders);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...customHeaders,
        },
        body: JSON.stringify(requestBody),
        signal: expect.any(AbortSignal),
      });
    });

    it("should throw REQUEST_TIMEOUT error on timeout", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const timeout = 1000;

      // Simulate AbortError when controller.abort() is called
      const abortError = new Error("The user aborted a request.");
      abortError.name = "AbortError";

      const mockFetch = vi.fn().mockRejectedValue(abortError);
      global.fetch = mockFetch as any;

      // Act & Assert
      await expect(httpClient.postWithTimeout(url, requestBody, timeout)).rejects.toThrow("REQUEST_TIMEOUT");
    });

    it("should throw HTTP error on 400 Bad Request", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const timeout = 5000;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({}),
      });
      global.fetch = mockFetch as any;

      // Act & Assert
      await expect(httpClient.postWithTimeout(url, requestBody, timeout)).rejects.toThrow("HTTP 400: Bad Request");
    });

    it("should throw HTTP error on 401 Unauthorized", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const timeout = 5000;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({}),
      });
      global.fetch = mockFetch as any;

      // Act & Assert
      await expect(httpClient.postWithTimeout(url, requestBody, timeout)).rejects.toThrow("HTTP 401: Unauthorized");
    });

    it("should throw HTTP error on 404 Not Found", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const timeout = 5000;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({}),
      });
      global.fetch = mockFetch as any;

      // Act & Assert
      await expect(httpClient.postWithTimeout(url, requestBody, timeout)).rejects.toThrow("HTTP 404: Not Found");
    });

    it("should throw HTTP error on 500 Internal Server Error", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const timeout = 5000;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      });
      global.fetch = mockFetch as any;

      // Act & Assert
      await expect(httpClient.postWithTimeout(url, requestBody, timeout)).rejects.toThrow(
        "HTTP 500: Internal Server Error"
      );
    });

    it("should properly JSON stringify request body", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const complexBody = {
        nested: {
          object: {
            with: "values",
          },
        },
        array: [1, 2, 3],
        boolean: true,
        number: 42,
      };
      const timeout = 5000;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch as any;

      // Act
      await httpClient.postWithTimeout(url, complexBody, timeout);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(complexBody),
        signal: expect.any(AbortSignal),
      });
    });

    it("should clear timeout after successful request", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const timeout = 5000;
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch as any;

      // Act
      await httpClient.postWithTimeout(url, requestBody, timeout);

      // Assert
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("should clear timeout even on error", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const timeout = 5000;
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });
      global.fetch = mockFetch as any;

      // Act
      try {
        await httpClient.postWithTimeout(url, requestBody, timeout);
      } catch (error) {
        // Expected error
      }

      // Assert
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("should re-throw non-timeout errors", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const timeout = 5000;
      const networkError = new Error("Network failure");

      const mockFetch = vi.fn().mockRejectedValue(networkError);
      global.fetch = mockFetch as any;

      // Act & Assert
      await expect(httpClient.postWithTimeout(url, requestBody, timeout)).rejects.toThrow("Network failure");
    });
  });

  describe("post()", () => {
    it("should make successful POST request without timeout", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const responseData = { result: "success" };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => responseData,
      });
      global.fetch = mockFetch as any;

      // Act
      const result = await httpClient.post(url, requestBody);

      // Assert
      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
    });

    it("should include custom headers in request", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const customHeaders = {
        Authorization: "Bearer token123",
        "X-Api-Key": "api-key-123",
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch as any;

      // Act
      await httpClient.post(url, requestBody, customHeaders);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...customHeaders,
        },
        body: JSON.stringify(requestBody),
      });
    });

    it("should throw HTTP error on 400 Bad Request", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });
      global.fetch = mockFetch as any;

      // Act & Assert
      await expect(httpClient.post(url, requestBody)).rejects.toThrow("HTTP 400: Bad Request");
    });

    it("should throw HTTP error on 500 Internal Server Error", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });
      global.fetch = mockFetch as any;

      // Act & Assert
      await expect(httpClient.post(url, requestBody)).rejects.toThrow("HTTP 500: Internal Server Error");
    });

    it("should properly parse JSON response", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const complexResponse = {
        data: {
          nested: {
            value: "test",
          },
        },
        metadata: {
          timestamp: "2024-01-01T00:00:00Z",
          version: 1,
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => complexResponse,
      });
      global.fetch = mockFetch as any;

      // Act
      const result = await httpClient.post(url, requestBody);

      // Assert
      expect(result).toEqual(complexResponse);
    });

    it("should handle network errors", async () => {
      // Arrange
      const url = "https://api.example.com/endpoint";
      const requestBody = { key: "value" };
      const networkError = new Error("Network connection failed");

      const mockFetch = vi.fn().mockRejectedValue(networkError);
      global.fetch = mockFetch as any;

      // Act & Assert
      await expect(httpClient.post(url, requestBody)).rejects.toThrow("Network connection failed");
    });
  });
});

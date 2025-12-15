import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenRouterService } from "../../../src/lib/services/openrouter.service.refactored";
import { HTTPClientService } from "../../../src/lib/http/http-client.service";
import { ExponentialBackoffStrategy } from "../../../src/lib/strategies/retry.strategy";
import { OpenRouterRequestBuilder } from "../../../src/lib/builders/openrouter-request.builder";
import {
  ValidationError,
  TimeoutError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
  APIError,
} from "../../../src/lib/errors/openrouter.errors";
import type {
  OpenRouterConfig,
  ChatCompletionOptions,
  OpenRouterAPIResponse,
  ResponseSchema,
  MessageContent,
} from "../../../src/types/openrouter.types";

/**
 * Integration tests for OpenRouterService
 *
 * Tests the integration of:
 * - HTTPClientService (mocked)
 * - ExponentialBackoffStrategy (mocked)
 * - OpenRouterRequestBuilder (mocked)
 *
 * Focuses on:
 * - Constructor validation
 * - Request building and execution flow
 * - Error classification and handling
 * - Response parsing
 * - Retry logic integration
 * - Dependency injection
 */
describe("OpenRouterService", () => {
  let service: OpenRouterService;
  let mockHttpClient: HTTPClientService;
  let mockRetryStrategy: ExponentialBackoffStrategy;
  let mockRequestBuilder: OpenRouterRequestBuilder;
  let config: OpenRouterConfig;

  beforeEach(() => {
    // Setup configuration
    config = {
      apiKey: "test-api-key",
      baseUrl: "https://api.test.com",
      timeout: 10000,
      defaultModel: "openai/gpt-4o-mini",
      retryAttempts: 3,
    };

    // Mock HTTPClientService
    mockHttpClient = {
      postWithTimeout: vi.fn(),
      post: vi.fn(),
    } as any;

    // Mock ExponentialBackoffStrategy
    mockRetryStrategy = {
      shouldRetry: vi.fn(),
      getDelay: vi.fn(),
    } as any;

    // Mock OpenRouterRequestBuilder
    mockRequestBuilder = {
      reset: vi.fn().mockReturnThis(),
      withModel: vi.fn().mockReturnThis(),
      withSystemMessage: vi.fn().mockReturnThis(),
      withUserMessage: vi.fn().mockReturnThis(),
      withResponseSchema: vi.fn().mockReturnThis(),
      withParameters: vi.fn().mockReturnThis(),
      build: vi.fn().mockReturnValue({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: "System prompt" },
          { role: "user", content: "User message" },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "test_schema",
            strict: true,
            schema: { type: "object" },
          },
        },
      }),
    } as any;

    // Mock console.log to avoid cluttering test output
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create service with valid config", () => {
      // Act
      service = new OpenRouterService(config, mockHttpClient, mockRetryStrategy, mockRequestBuilder);

      // Assert
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("should throw ValidationError if API key is missing", () => {
      // Arrange
      const invalidConfig = { ...config, apiKey: "" };

      // Act & Assert
      expect(() => new OpenRouterService(invalidConfig)).toThrow(ValidationError);
      expect(() => new OpenRouterService(invalidConfig)).toThrow("API key is required");
    });

    it("should throw ValidationError if API key is only whitespace", () => {
      // Arrange
      const invalidConfig = { ...config, apiKey: "   " };

      // Act & Assert
      expect(() => new OpenRouterService(invalidConfig)).toThrow(ValidationError);
    });

    it("should use default values for optional config", () => {
      // Arrange
      const minimalConfig: OpenRouterConfig = {
        apiKey: "test-key",
      };

      // Act
      service = new OpenRouterService(minimalConfig, mockHttpClient, mockRetryStrategy, mockRequestBuilder);

      // Assert - service created successfully
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("should create default dependencies if not provided", () => {
      // Arrange
      const minimalConfig: OpenRouterConfig = {
        apiKey: "test-key",
      };

      // Act - no dependencies provided
      service = new OpenRouterService(minimalConfig);

      // Assert - service created with internal dependencies
      expect(service).toBeInstanceOf(OpenRouterService);
    });
  });

  describe("chatCompletion()", () => {
    beforeEach(() => {
      service = new OpenRouterService(config, mockHttpClient, mockRetryStrategy, mockRequestBuilder);
    });

    it("should successfully complete chat with structured response", async () => {
      // Arrange
      const mockApiResponse: OpenRouterAPIResponse = {
        id: "test-id",
        model: "openai/gpt-4o-mini",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({ result: "success", data: 123 }),
            },
            finish_reason: "stop",
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      vi.mocked(mockHttpClient.postWithTimeout).mockResolvedValue(mockApiResponse);

      const options: ChatCompletionOptions = {
        systemMessage: "You are helpful",
        userMessage: "Hello",
        responseSchema: {
          name: "test",
          schema: { type: "object" },
        },
      };

      // Act
      const result = await service.chatCompletion<{ result: string; data: number }>(options);

      // Assert
      expect(result.data).toEqual({ result: "success", data: 123 });
      expect(result.model).toBe("openai/gpt-4o-mini");
      expect(result.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      });
    });

    it("should build request using RequestBuilder", async () => {
      // Arrange
      const mockApiResponse: OpenRouterAPIResponse = {
        id: "test-id",
        model: "openai/gpt-4o-mini",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({ test: "data" }),
            },
            finish_reason: "stop",
            index: 0,
          },
        ],
      };

      vi.mocked(mockHttpClient.postWithTimeout).mockResolvedValue(mockApiResponse);

      const schema: ResponseSchema = {
        name: "test_schema",
        schema: { type: "object", properties: { test: { type: "string" } } },
      };

      const options: ChatCompletionOptions = {
        systemMessage: "System prompt",
        userMessage: "User message",
        responseSchema: schema,
        model: "custom-model",
        parameters: {
          temperature: 0.7,
          max_tokens: 1000,
        },
      };

      // Act
      await service.chatCompletion(options);

      // Assert - verify builder methods called correctly
      expect(mockRequestBuilder.reset).toHaveBeenCalled();
      expect(mockRequestBuilder.withModel).toHaveBeenCalledWith("custom-model");
      expect(mockRequestBuilder.withSystemMessage).toHaveBeenCalledWith("System prompt");
      expect(mockRequestBuilder.withUserMessage).toHaveBeenCalledWith("User message");
      expect(mockRequestBuilder.withResponseSchema).toHaveBeenCalledWith(schema);
      expect(mockRequestBuilder.withParameters).toHaveBeenCalledWith({
        temperature: 0.7,
        max_tokens: 1000,
      });
      expect(mockRequestBuilder.build).toHaveBeenCalled();
    });

    it("should use default model if not specified", async () => {
      // Arrange
      const mockApiResponse: OpenRouterAPIResponse = {
        id: "test-id",
        model: "openai/gpt-4o-mini",
        choices: [
          {
            message: { role: "assistant", content: JSON.stringify({ data: "test" }) },
            finish_reason: "stop",
            index: 0,
          },
        ],
      };

      vi.mocked(mockHttpClient.postWithTimeout).mockResolvedValue(mockApiResponse);

      const options: ChatCompletionOptions = {
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: { name: "test", schema: { type: "object" } },
        // model not specified
      };

      // Act
      await service.chatCompletion(options);

      // Assert - should use default model
      expect(mockRequestBuilder.withModel).toHaveBeenCalledWith("openai/gpt-4o-mini");
    });

    it("should execute request with correct headers and timeout", async () => {
      // Arrange
      const mockApiResponse: OpenRouterAPIResponse = {
        id: "test-id",
        model: "openai/gpt-4o-mini",
        choices: [
          {
            message: { role: "assistant", content: JSON.stringify({ data: "test" }) },
            finish_reason: "stop",
            index: 0,
          },
        ],
      };

      vi.mocked(mockHttpClient.postWithTimeout).mockResolvedValue(mockApiResponse);

      const options: ChatCompletionOptions = {
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: { name: "test", schema: { type: "object" } },
      };

      // Act
      await service.chatCompletion(options);

      // Assert - verify HTTP client called with correct parameters
      expect(mockHttpClient.postWithTimeout).toHaveBeenCalledWith(
        "https://api.test.com/chat/completions",
        expect.any(Object),
        10000, // timeout
        {
          Authorization: "Bearer test-api-key",
          "HTTP-Referer": "https://paragoniusz.app",
          "X-Title": "Paragoniusz",
        }
      );
    });

    it("should handle multimodal user message", async () => {
      // Arrange
      const mockApiResponse: OpenRouterAPIResponse = {
        id: "test-id",
        model: "openai/gpt-4o-mini",
        choices: [
          {
            message: { role: "assistant", content: JSON.stringify({ result: "ok" }) },
            finish_reason: "stop",
            index: 0,
          },
        ],
      };

      vi.mocked(mockHttpClient.postWithTimeout).mockResolvedValue(mockApiResponse);

      const multimodalMessage: MessageContent[] = [
        { type: "text", text: "Describe this image" },
        { type: "image_url", image_url: { url: "https://example.com/image.jpg" } },
      ];

      const options: ChatCompletionOptions = {
        systemMessage: "You are helpful",
        userMessage: multimodalMessage,
        responseSchema: { name: "test", schema: { type: "object" } },
      };

      // Act
      await service.chatCompletion(options);

      // Assert
      expect(mockRequestBuilder.withUserMessage).toHaveBeenCalledWith(multimodalMessage);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      service = new OpenRouterService(config, mockHttpClient, mockRetryStrategy, mockRequestBuilder);
    });

    it("should throw TimeoutError when REQUEST_TIMEOUT occurs", async () => {
      // Arrange
      vi.mocked(mockHttpClient.postWithTimeout).mockRejectedValue(new Error("REQUEST_TIMEOUT"));

      const options: ChatCompletionOptions = {
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: { name: "test", schema: { type: "object" } },
      };

      // Act & Assert
      await expect(service.chatCompletion(options)).rejects.toThrow(TimeoutError);
    });

    it("should throw AuthenticationError for HTTP 401", async () => {
      // Arrange
      vi.mocked(mockHttpClient.postWithTimeout).mockRejectedValue(new Error("HTTP 401: Unauthorized"));

      const options: ChatCompletionOptions = {
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: { name: "test", schema: { type: "object" } },
      };

      // Act & Assert
      await expect(service.chatCompletion(options)).rejects.toThrow(AuthenticationError);
    });

    it("should throw AuthenticationError for HTTP 403", async () => {
      // Arrange
      vi.mocked(mockHttpClient.postWithTimeout).mockRejectedValue(new Error("HTTP 403: Forbidden"));

      const options: ChatCompletionOptions = {
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: { name: "test", schema: { type: "object" } },
      };

      // Act & Assert
      await expect(service.chatCompletion(options)).rejects.toThrow(AuthenticationError);
    });

    it("should throw RateLimitError for HTTP 429", async () => {
      // Arrange
      vi.mocked(mockHttpClient.postWithTimeout).mockRejectedValue(new Error("HTTP 429: Too Many Requests"));

      const options: ChatCompletionOptions = {
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: { name: "test", schema: { type: "object" } },
      };

      // Act & Assert
      await expect(service.chatCompletion(options)).rejects.toThrow(RateLimitError);
    });

    it("should throw ValidationError for HTTP 400", async () => {
      // Arrange
      vi.mocked(mockHttpClient.postWithTimeout).mockRejectedValue(new Error("HTTP 400: Bad Request"));

      const options: ChatCompletionOptions = {
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: { name: "test", schema: { type: "object" } },
      };

      // Act & Assert
      await expect(service.chatCompletion(options)).rejects.toThrow(ValidationError);
    });

    it("should throw APIError for other HTTP errors", async () => {
      // Arrange
      vi.mocked(mockHttpClient.postWithTimeout).mockRejectedValue(new Error("HTTP 500: Internal Server Error"));

      const options: ChatCompletionOptions = {
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: { name: "test", schema: { type: "object" } },
      };

      // Act & Assert
      await expect(service.chatCompletion(options)).rejects.toThrow(APIError);
    });

    it("should throw NetworkError for fetch errors", async () => {
      // Arrange
      const fetchError = new TypeError("fetch failed");
      vi.mocked(mockHttpClient.postWithTimeout).mockRejectedValue(fetchError);

      const options: ChatCompletionOptions = {
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: { name: "test", schema: { type: "object" } },
      };

      // Act & Assert
      await expect(service.chatCompletion(options)).rejects.toThrow(NetworkError);
    });

    it("should throw ValidationError if response has no content", async () => {
      // Arrange
      const mockApiResponse: OpenRouterAPIResponse = {
        id: "test-id",
        model: "openai/gpt-4o-mini",
        choices: [
          {
            message: { role: "assistant", content: "" }, // Empty content
            finish_reason: "stop",
            index: 0,
          },
        ],
      };

      vi.mocked(mockHttpClient.postWithTimeout).mockResolvedValue(mockApiResponse);

      const options: ChatCompletionOptions = {
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: { name: "test", schema: { type: "object" } },
      };

      // Act & Assert
      await expect(service.chatCompletion(options)).rejects.toThrow(ValidationError);
      await expect(service.chatCompletion(options)).rejects.toThrow("No content in API response");
    });

    it("should throw ValidationError if response content is not valid JSON", async () => {
      // Arrange
      const mockApiResponse: OpenRouterAPIResponse = {
        id: "test-id",
        model: "openai/gpt-4o-mini",
        choices: [
          {
            message: { role: "assistant", content: "Invalid JSON {{{" },
            finish_reason: "stop",
            index: 0,
          },
        ],
      };

      vi.mocked(mockHttpClient.postWithTimeout).mockResolvedValue(mockApiResponse);

      const options: ChatCompletionOptions = {
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: { name: "test", schema: { type: "object" } },
      };

      // Act & Assert
      await expect(service.chatCompletion(options)).rejects.toThrow(ValidationError);
      await expect(service.chatCompletion(options)).rejects.toThrow("Failed to parse response as JSON");
    });
  });

  describe("buildResponseFormat()", () => {
    beforeEach(() => {
      service = new OpenRouterService(config, mockHttpClient, mockRetryStrategy, mockRequestBuilder);
    });

    it("should build proper response format structure", () => {
      // Arrange
      const schema: ResponseSchema = {
        name: "test_schema",
        schema: {
          type: "object",
          properties: {
            field: { type: "string" },
          },
        },
      };

      // Act
      const result = service.buildResponseFormat(schema);

      // Assert
      expect(result).toEqual({
        type: "json_schema",
        json_schema: {
          name: "test_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {
              field: { type: "string" },
            },
          },
        },
      });
    });

    it("should always set strict to true", () => {
      // Arrange
      const schema: ResponseSchema = {
        name: "strict_test",
        schema: { type: "object" },
      };

      // Act
      const result = service.buildResponseFormat(schema);

      // Assert
      expect(result.json_schema.strict).toBe(true);
    });
  });

  describe("Logging", () => {
    beforeEach(() => {
      service = new OpenRouterService(config, mockHttpClient, mockRetryStrategy, mockRequestBuilder);
      vi.clearAllMocks();
    });

    it("should log LLM call", async () => {
      // Arrange
      const mockApiResponse: OpenRouterAPIResponse = {
        id: "test-id",
        model: "openai/gpt-4o-mini",
        choices: [
          {
            message: { role: "assistant", content: JSON.stringify({ data: "test" }) },
            finish_reason: "stop",
            index: 0,
          },
        ],
      };

      vi.mocked(mockHttpClient.postWithTimeout).mockResolvedValue(mockApiResponse);

      const options: ChatCompletionOptions = {
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: { name: "test", schema: { type: "object" } },
      };

      // Act
      await service.chatCompletion(options);

      // Assert
      expect(console.log).toHaveBeenCalledWith("[OpenRouter] Calling LLM: openai/gpt-4o-mini");
    });

    it("should log response and token usage", async () => {
      // Arrange
      const mockApiResponse: OpenRouterAPIResponse = {
        id: "test-id",
        model: "openai/gpt-4o-mini",
        choices: [
          {
            message: { role: "assistant", content: JSON.stringify({ data: "test" }) },
            finish_reason: "stop",
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      vi.mocked(mockHttpClient.postWithTimeout).mockResolvedValue(mockApiResponse);

      const options: ChatCompletionOptions = {
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: { name: "test", schema: { type: "object" } },
      };

      // Act
      await service.chatCompletion(options);

      // Assert
      expect(console.log).toHaveBeenCalledWith("[OpenRouter] Response received from: openai/gpt-4o-mini");
      expect(console.log).toHaveBeenCalledWith("[OpenRouter] Token usage - Prompt: 10, Completion: 20, Total: 30");
    });
  });
});

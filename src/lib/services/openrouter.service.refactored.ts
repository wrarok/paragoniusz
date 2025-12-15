/**
 * OpenRouter Service (Refactored)
 *
 * A TypeScript client for interacting with the OpenRouter API to perform
 * LLM-based chat completions with structured JSON responses.
 *
 * This service is primarily used for extracting structured data from receipt images
 * in the Paragoniusz application.
 *
 * Refactored to implement SOLID principles:
 * - Single Responsibility: Only orchestration and error classification
 * - Open/Closed: Extensible through dependency injection
 * - Liskov Substitution: Depends on abstractions (HTTPClientService, RetryStrategy)
 * - Interface Segregation: Clean, focused interfaces
 * - Dependency Inversion: Depends on abstractions, not concretions (fetch, setTimeout)
 *
 * @example
 * ```typescript
 * const openRouter = new OpenRouterService({
 *   apiKey: import.meta.env.OPENROUTER_API_KEY,
 *   timeout: 20000
 * });
 *
 * const result = await openRouter.chatCompletion<ReceiptData>({
 *   systemMessage: "You are an expert at extracting data from Polish receipts.",
 *   userMessage: [
 *     { type: 'text', text: 'Extract all items from this receipt' },
 *     { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
 *   ],
 *   responseSchema: {
 *     name: 'receipt_extraction',
 *     schema: receiptSchema
 *   },
 *   model: 'openai/gpt-4-vision-preview',
 *   parameters: {
 *     temperature: 0.1,
 *     max_tokens: 2000
 *   }
 * });
 * ```
 */

import type {
  OpenRouterConfig,
  ChatCompletionOptions,
  ChatCompletionResponse,
  OpenRouterAPIResponse,
  ResponseSchema,
  ResponseFormat,
} from "../../types/openrouter.types";

import {
  OpenRouterError,
  NetworkError,
  TimeoutError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  APIError,
} from "../errors/openrouter.errors";

import { HTTPClientService } from "../http/http-client.service";
import { ExponentialBackoffStrategy, withRetry } from "../strategies/retry.strategy";
import { OpenRouterRequestBuilder } from "../builders/openrouter-request.builder";

/**
 * OpenRouter Service Class (Refactored)
 *
 * Handles all communication with the OpenRouter API including:
 * - Chat completions with structured JSON responses
 * - Timeout management (20 seconds default per PRD)
 * - Error handling and classification
 * - Retry logic for transient failures
 * - Secure API key management
 *
 * Refactored to use dependency injection:
 * - HTTPClientService for HTTP operations with timeout
 * - ExponentialBackoffStrategy for retry logic with exponential backoff
 * - OpenRouterRequestBuilder for fluent request construction
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly defaultModel: string;
  private readonly httpClient: HTTPClientService;
  private readonly retryStrategy: ExponentialBackoffStrategy;
  private readonly requestBuilder: OpenRouterRequestBuilder;

  /**
   * Creates a new OpenRouter service instance with dependencies
   *
   * Dependencies can be injected for testing or customization.
   * If not provided, default implementations will be used.
   *
   * @param config - Configuration options for the service
   * @param httpClient - Optional HTTP client (for testing/mocking)
   * @param retryStrategy - Optional retry strategy (for testing/mocking)
   * @param requestBuilder - Optional request builder (for testing/mocking)
   * @throws {ValidationError} If API key is missing or invalid
   *
   * @example
   * ```typescript
   * const service = new OpenRouterService({
   *   apiKey: Deno.env.get('OPENROUTER_API_KEY')!,
   *   timeout: 20000,
   *   defaultModel: 'openai/gpt-4-vision-preview'
   * });
   * ```
   */
  constructor(
    config: OpenRouterConfig,
    httpClient?: HTTPClientService,
    retryStrategy?: ExponentialBackoffStrategy,
    requestBuilder?: OpenRouterRequestBuilder
  ) {
    // Validate API key is present
    if (!config.apiKey || config.apiKey.trim() === "") {
      throw new ValidationError("API key is required");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";
    this.timeout = config.timeout || 20000; // 20 seconds default per PRD requirement
    this.defaultModel = config.defaultModel || "openai/gpt-4o-mini";

    // Initialize dependencies (allow injection for testing/customization)
    this.httpClient = httpClient || new HTTPClientService();
    this.retryStrategy = retryStrategy || new ExponentialBackoffStrategy(config.retryAttempts || 3);
    this.requestBuilder = requestBuilder || new OpenRouterRequestBuilder();
  }

  /**
   * Performs a chat completion request with structured JSON response
   *
   * This is the main method for interacting with the OpenRouter API.
   * It handles the complete flow: building the request, executing it with
   * retry logic, and parsing the structured response.
   *
   * Orchestrates:
   * 1. Build request using OpenRouterRequestBuilder
   * 2. Execute with retry logic via ExponentialBackoffStrategy
   * 3. Parse and validate response
   *
   * @template T - The expected type of the structured response data
   * @param options - Chat completion options including messages, schema, and parameters
   * @returns Promise resolving to the structured response with typed data
   * @throws {TimeoutError} If request exceeds timeout limit
   * @throws {AuthenticationError} If API key is invalid
   * @throws {ValidationError} If request or response validation fails
   * @throws {RateLimitError} If rate limit is exceeded
   * @throws {APIError} For other API errors
   * @throws {NetworkError} For network-related failures
   *
   * @example
   * ```typescript
   * const result = await service.chatCompletion<ReceiptData>({
   *   systemMessage: "Extract receipt data",
   *   userMessage: "Process this receipt",
   *   responseSchema: { name: 'receipt', schema: receiptSchema }
   * });
   * console.log(result.data); // Typed as ReceiptData
   * ```
   */
  async chatCompletion<T>(options: ChatCompletionOptions): Promise<ChatCompletionResponse<T>> {
    try {
      // Build request using builder
      const request = this.buildRequest(options);

      // Log which model is being called (only in development)
      if (import.meta.env.DEV) {
        console.log(`[OpenRouter] Calling LLM: ${request.model}`);
      }

      // Execute with retry logic
      const response = await withRetry(() => this.executeRequest(request), this.retryStrategy);

      // Parse and validate response
      return this.parseResponse<T>(response as OpenRouterAPIResponse);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Builds a properly formatted response_format object for OpenRouter API
   *
   * This helper constructs the response_format parameter with the correct structure
   * required by OpenRouter for structured JSON outputs.
   *
   * This method is public to maintain backward compatibility with existing code.
   *
   * @param schema - The response schema definition
   * @returns Formatted response_format object
   *
   * @example
   * ```typescript
   * const format = service.buildResponseFormat({
   *   name: 'receipt_extraction',
   *   schema: { type: 'object', properties: {...} }
   * });
   * // Returns: { type: 'json_schema', json_schema: { name: '...', strict: true, schema: {...} } }
   * ```
   */
  public buildResponseFormat(schema: ResponseSchema): ResponseFormat {
    return {
      type: "json_schema",
      json_schema: {
        name: schema.name,
        strict: true,
        schema: schema.schema,
      },
    };
  }

  /**
   * Builds the complete request body for OpenRouter API
   *
   * Delegates all request construction to OpenRouterRequestBuilder.
   * Uses fluent API for clean, readable request building.
   *
   * @param options - Chat completion options
   * @returns Complete OpenRouter API request object
   * @private
   */
  private buildRequest(options: ChatCompletionOptions) {
    this.requestBuilder
      .reset()
      .withModel(options.model || this.defaultModel)
      .withSystemMessage(options.systemMessage)
      .withUserMessage(options.userMessage)
      .withResponseSchema(options.responseSchema);

    if (options.parameters) {
      this.requestBuilder.withParameters(options.parameters);
    }

    return this.requestBuilder.build();
  }

  /**
   * Executes HTTP request to OpenRouter API with timeout handling
   *
   * Delegates HTTP operation to HTTPClientService which handles:
   * - AbortController for timeout management
   * - Proper headers (Authorization, Content-Type, HTTP-Referer, X-Title)
   * - Response status code handling
   * - JSON parsing
   *
   * Classifies HTTP errors into appropriate OpenRouterError subclasses.
   *
   * @param request - The OpenRouter API request object
   * @returns Promise resolving to the raw API response
   * @throws {TimeoutError} If request exceeds timeout
   * @throws {AuthenticationError} For 401/403 status codes
   * @throws {RateLimitError} For 429 status code
   * @throws {ValidationError} For 400 status code
   * @throws {APIError} For other non-2xx status codes
   * @throws {NetworkError} For network failures
   * @private
   */
  private async executeRequest(request: unknown): Promise<unknown> {
    try {
      const response = await this.httpClient.postWithTimeout<OpenRouterAPIResponse>(
        `${this.baseUrl}/chat/completions`,
        request,
        this.timeout,
        {
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://paragoniusz.app",
          "X-Title": "Paragoniusz",
        }
      );

      return response;
    } catch (error) {
      // Classify errors based on error message or type
      if (error instanceof Error) {
        if (error.message === "REQUEST_TIMEOUT") {
          throw new TimeoutError();
        }
        if (error.message.includes("HTTP 401") || error.message.includes("HTTP 403")) {
          throw new AuthenticationError(error.message);
        }
        if (error.message.includes("HTTP 429")) {
          throw new RateLimitError(error.message);
        }
        if (error.message.includes("HTTP 400")) {
          throw new ValidationError(error.message);
        }
        if (error.message.includes("HTTP")) {
          // Extract status code if present
          const statusMatch = error.message.match(/HTTP (\d+)/);
          const status = statusMatch ? parseInt(statusMatch[1]) : 500;
          throw new APIError(error.message, status);
        }
      }
      throw error;
    }
  }

  /**
   * Parses and validates API response
   *
   * Extracts JSON content from API response, validates it, and logs usage.
   * Provides detailed logging for debugging and monitoring.
   *
   * @template T - Expected response data type
   * @param apiResponse - Raw API response from OpenRouter
   * @returns Structured response with typed data and metadata
   * @throws {ValidationError} If response is invalid or cannot be parsed as JSON
   * @private
   */
  private parseResponse<T>(apiResponse: OpenRouterAPIResponse): ChatCompletionResponse<T> {
    const content = apiResponse.choices[0]?.message?.content;

    if (!content) {
      throw new ValidationError("No content in API response");
    }

    // Parse JSON content
    let data: T;
    try {
      data = JSON.parse(content) as T;
    } catch (error) {
      throw new ValidationError("Failed to parse response as JSON", error instanceof Error ? error.message : undefined);
    }

    // Log successful response (only in development)
    if (import.meta.env.DEV) {
      console.log(`[OpenRouter] Response received from: ${apiResponse.model}`);
      if (apiResponse.usage) {
        console.log(
          `[OpenRouter] Token usage - Prompt: ${apiResponse.usage.prompt_tokens}, Completion: ${apiResponse.usage.completion_tokens}, Total: ${apiResponse.usage.total_tokens}`
        );
      }
    }

    return {
      data,
      model: apiResponse.model,
      usage: apiResponse.usage,
    };
  }

  /**
   * Handles and classifies errors, converting them to appropriate error types
   *
   * This method ensures all errors are properly classified and provides
   * consistent error handling across the service.
   *
   * Preserves custom OpenRouterError instances and converts unknown errors.
   *
   * @param error - The error to handle
   * @throws Always throws an appropriate OpenRouterError subclass
   * @private
   */
  private handleError(error: unknown): never {
    // Re-throw if already our custom error
    if (error instanceof OpenRouterError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError(error.message);
    }

    // Generic fallback
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    throw new OpenRouterError(message, "UNKNOWN_ERROR");
  }
}

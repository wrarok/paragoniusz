/**
 * OpenRouter Service
 * 
 * A TypeScript client for interacting with the OpenRouter API to perform
 * LLM-based chat completions with structured JSON responses.
 * 
 * This service is primarily used for extracting structured data from receipt images
 * in the Paragoniusz application.
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
  ResponseFormat,
  ResponseSchema,
  OpenRouterRequest,
  OpenRouterAPIResponse,
  OpenRouterAPIError,
} from '../../types/openrouter.types.ts';

import {
  OpenRouterError,
  NetworkError,
  TimeoutError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  APIError,
} from '../errors/openrouter.errors';

/**
 * OpenRouter Service Class
 * 
 * Handles all communication with the OpenRouter API including:
 * - Chat completions with structured JSON responses
 * - Timeout management (20 seconds default per PRD)
 * - Error handling and classification
 * - Retry logic for transient failures
 * - Secure API key management
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly defaultModel: string;
  private readonly retryAttempts: number;

  /**
   * Creates a new OpenRouter service instance
   * 
   * @param config - Configuration options for the service
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
  constructor(config: OpenRouterConfig) {
    // Validate API key is present
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new ValidationError('API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this.timeout = config.timeout || 20000; // 20 seconds default per PRD requirement
    this.defaultModel = config.defaultModel || 'openai/gpt-4o-mini';
    this.retryAttempts = config.retryAttempts || 3;
  }

  /**
   * Performs a chat completion request with structured JSON response
   * 
   * This is the main method for interacting with the OpenRouter API.
   * It handles the complete flow: building the request, executing it with
   * retry logic, and parsing the structured response.
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
  async chatCompletion<T>(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse<T>> {
    try {
      // Build the request
      const request = this.buildRequest(options);
      
      // Log which model is being called
      console.log(`[OpenRouter] Calling LLM: ${request.model}`);

      // Execute with retry logic
      const response = await this.withRetry(() => this.executeRequest(request));

      // Extract and parse the response
      const apiResponse = response as OpenRouterAPIResponse;
      const content = apiResponse.choices[0]?.message?.content;

      if (!content) {
        throw new ValidationError('No content in API response');
      }

      // Parse JSON content
      let data: T;
      try {
        data = JSON.parse(content) as T;
      } catch (error) {
        throw new ValidationError(
          'Failed to parse response as JSON',
          error instanceof Error ? error.message : undefined
        );
      }

      // Log successful response
      console.log(`[OpenRouter] Response received from: ${apiResponse.model}`);
      if (apiResponse.usage) {
        console.log(`[OpenRouter] Token usage - Prompt: ${apiResponse.usage.prompt_tokens}, Completion: ${apiResponse.usage.completion_tokens}, Total: ${apiResponse.usage.total_tokens}`);
      }
      
      // Return structured response
      return {
        data,
        model: apiResponse.model,
        usage: apiResponse.usage,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Builds a properly formatted response_format object for OpenRouter API
   * 
   * This helper constructs the response_format parameter with the correct structure
   * required by OpenRouter for structured JSON outputs.
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
      type: 'json_schema',
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
   * Constructs the request with:
   * - System and user messages
   * - Response format with JSON schema
   * - Model selection
   * - Model parameters (temperature, max_tokens, etc.)
   * 
   * @param options - Chat completion options
   * @returns Complete OpenRouter API request object
   * @private
   */
  private buildRequest(options: ChatCompletionOptions): OpenRouterRequest {
    // Build messages array
    const messages = [
      {
        role: 'system' as const,
        content: options.systemMessage,
      },
      {
        role: 'user' as const,
        content: options.userMessage,
      },
    ];

    // Build response format
    const responseFormat = this.buildResponseFormat(options.responseSchema);

    // Select model (use provided or default)
    const model = options.model || this.defaultModel;

    // Build complete request
    const request: OpenRouterRequest = {
      model,
      messages,
      response_format: responseFormat,
    };

    // Add optional parameters if provided
    if (options.parameters) {
      if (options.parameters.temperature !== undefined) {
        request.temperature = options.parameters.temperature;
      }
      if (options.parameters.max_tokens !== undefined) {
        request.max_tokens = options.parameters.max_tokens;
      }
      if (options.parameters.top_p !== undefined) {
        request.top_p = options.parameters.top_p;
      }
    }

    return request;
  }

  /**
   * Executes HTTP request to OpenRouter API with timeout handling
   * 
   * This method:
   * - Sets up AbortController for timeout management
   * - Configures proper headers (Authorization, Content-Type, etc.)
   * - Handles response status codes
   * - Parses JSON response
   * - Cleans up timeout on completion
   * 
   * @param request - The OpenRouter API request object
   * @returns Promise resolving to the raw API response
   * @throws {TimeoutError} If request exceeds timeout
   * @throws {APIError} For non-2xx status codes
   * @throws {NetworkError} For network failures
   * @private
   */
  private async executeRequest(request: OpenRouterRequest): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://paragoniusz.app',
          'X-Title': 'Paragoniusz',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as OpenRouterAPIError;
        const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
        
        // Classify error by status code
        if (response.status === 401 || response.status === 403) {
          throw new AuthenticationError(errorMessage);
        }
        if (response.status === 429) {
          throw new RateLimitError(errorMessage);
        }
        if (response.status === 400) {
          throw new ValidationError(errorMessage);
        }
        
        throw new APIError(errorMessage, response.status);
      }

      return await response.json();
    } catch (error) {
      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError();
      }
      
      // Re-throw if already our custom error
      if (error instanceof OpenRouterError) {
        throw error;
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError(error.message);
      }
      
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handles and classifies errors, converting them to appropriate error types
   * 
   * This method ensures all errors are properly classified and provides
   * consistent error handling across the service.
   * 
   * @param error - The error to handle
   * @throws Always throws an appropriate OpenRouterError subclass
   * @private
   */
  private handleError(error: unknown): never {
    // If already our custom error, re-throw
    if (error instanceof OpenRouterError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError(error.message);
    }

    // Handle abort errors (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError();
    }

    // Generic error fallback
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new OpenRouterError(message, 'UNKNOWN_ERROR');
  }

  /**
   * Executes an operation with retry logic for transient failures
   * 
   * Implements exponential backoff for retrying failed requests.
   * Only retries for specific error types (network, rate limit, server errors).
   * Does not retry for authentication, validation, or timeout errors.
   * 
   * @template T - Return type of the operation
   * @param operation - The async operation to execute
   * @param attempts - Number of retry attempts (default: from config)
   * @returns Promise resolving to the operation result
   * @throws The last error if all retries fail
   * @private
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    attempts: number = this.retryAttempts
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry these error types
        if (
          error instanceof AuthenticationError ||
          error instanceof ValidationError ||
          error instanceof TimeoutError
        ) {
          throw error;
        }

        // Don't retry on last attempt
        if (i === attempts - 1) {
          throw error;
        }

        // Calculate exponential backoff delay
        const delay = 1000 * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError!;
  }
}
import type {
  OpenRouterRequest,
  ResponseSchema,
  ResponseFormat,
  MessageContent,
  ModelParameters,
} from "../../types/openrouter.types";

/**
 * Builder for OpenRouter API requests
 *
 * Provides fluent API for constructing requests.
 * Eliminates verbose conditional parameter building.
 *
 * @example
 * ```typescript
 * const builder = new OpenRouterRequestBuilder();
 * const request = builder
 *   .withModel('openai/gpt-4o-mini')
 *   .withSystemMessage('You are a helpful assistant')
 *   .withUserMessage('Hello!')
 *   .withResponseSchema({ name: 'response', schema: {...} })
 *   .withParameters({ temperature: 0.7 })
 *   .build();
 * ```
 */
export class OpenRouterRequestBuilder {
  private request: Partial<OpenRouterRequest> = {};

  /**
   * Set model
   * @param model - Model identifier (e.g., 'openai/gpt-4o-mini')
   * @returns this builder for chaining
   */
  withModel(model: string): this {
    this.request.model = model;
    return this;
  }

  /**
   * Set system message
   * @param message - System message content
   * @returns this builder for chaining
   */
  withSystemMessage(message: string): this {
    if (!this.request.messages) {
      this.request.messages = [];
    }
    this.request.messages.push({
      role: "system",
      content: message,
    });
    return this;
  }

  /**
   * Set user message
   * @param message - User message content (can be string or multimodal)
   * @returns this builder for chaining
   */
  withUserMessage(message: string | MessageContent[]): this {
    if (!this.request.messages) {
      this.request.messages = [];
    }
    this.request.messages.push({
      role: "user",
      content: message,
    });
    return this;
  }

  /**
   * Set response schema for structured outputs
   * @param schema - Response schema definition
   * @returns this builder for chaining
   */
  withResponseSchema(schema: ResponseSchema): this {
    this.request.response_format = this.buildResponseFormat(schema);
    return this;
  }

  /**
   * Set model parameters (temperature, max_tokens, top_p)
   *
   * Only sets parameters that are provided (undefined values ignored).
   *
   * @param params - Model parameters
   * @returns this builder for chaining
   */
  withParameters(params: ModelParameters): this {
    if (params.temperature !== undefined) {
      this.request.temperature = params.temperature;
    }
    if (params.max_tokens !== undefined) {
      this.request.max_tokens = params.max_tokens;
    }
    if (params.top_p !== undefined) {
      this.request.top_p = params.top_p;
    }
    return this;
  }

  /**
   * Build final request
   *
   * Validates that required fields are present.
   *
   * @returns Complete OpenRouter API request
   * @throws {Error} If required fields are missing
   */
  build(): OpenRouterRequest {
    if (!this.request.model || !this.request.messages) {
      throw new Error("Model and messages are required");
    }
    return this.request as OpenRouterRequest;
  }

  /**
   * Reset builder to initial state
   *
   * Useful for reusing the same builder instance.
   *
   * @returns this builder for chaining
   */
  reset(): this {
    this.request = {};
    return this;
  }

  /**
   * Build response format from schema
   *
   * Constructs the response_format object required by OpenRouter API.
   *
   * @param schema - Response schema definition
   * @returns Formatted response_format object
   * @private
   */
  private buildResponseFormat(schema: ResponseSchema): ResponseFormat {
    return {
      type: "json_schema",
      json_schema: {
        name: schema.name,
        strict: true,
        schema: schema.schema,
      },
    };
  }
}

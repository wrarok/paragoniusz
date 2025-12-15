/**
 * OpenRouter Service Type Definitions
 *
 * This file contains all TypeScript interfaces and types used by the OpenRouter service
 * for interacting with the OpenRouter API to perform LLM-based chat completions.
 */

/**
 * Configuration options for initializing the OpenRouter service
 */
export interface OpenRouterConfig {
  /** API key from environment variables (REQUIRED) */
  apiKey: string;
  /** Base URL for OpenRouter API (default: 'https://openrouter.ai/api/v1') */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 20000 - 20 seconds per PRD requirement) */
  timeout?: number;
  /** Default model to use for completions */
  defaultModel?: string;
  /** Number of retry attempts for transient failures (default: 3) */
  retryAttempts?: number;
}

/**
 * Options for chat completion requests
 */
export interface ChatCompletionOptions {
  /** System prompt that defines AI behavior and context */
  systemMessage: string;
  /** User message - can be text only or multimodal (text + images) */
  userMessage: string | MessageContent[];
  /** JSON schema definition for structured output */
  responseSchema: ResponseSchema;
  /** Model to use (overrides default model from config) */
  model?: string;
  /** Model-specific parameters (temperature, max_tokens, etc.) */
  parameters?: ModelParameters;
}

/**
 * Content type for multimodal messages (text and/or images)
 */
export interface MessageContent {
  /** Type of content */
  type: "text" | "image_url";
  /** Text content (for type: 'text') */
  text?: string;
  /** Image URL content (for type: 'image_url') */
  image_url?: {
    /** Base64 data URI (data:image/jpeg;base64,...) or HTTP(S) URL */
    url: string;
  };
}

/**
 * JSON Schema definition for structured responses
 */
export interface ResponseSchema {
  /** Schema name (e.g., 'receipt_extraction') */
  name: string;
  /** JSON Schema object defining the expected structure */
  schema: object;
}

/**
 * Model-specific parameters for fine-tuning responses
 */
export interface ModelParameters {
  /** Controls randomness (0.0 = deterministic, 2.0 = very random). Default: 0.1 for extraction */
  temperature?: number;
  /** Maximum number of tokens in the response */
  max_tokens?: number;
  /** Nucleus sampling parameter (0.0 to 1.0) */
  top_p?: number;
}

/**
 * Response from chat completion request
 */
export interface ChatCompletionResponse<T> {
  /** Parsed and validated response data matching the provided schema */
  data: T;
  /** Model that was used for the completion */
  model: string;
  /** Token usage statistics (if available) */
  usage?: {
    /** Number of tokens in the prompt */
    prompt_tokens: number;
    /** Number of tokens in the completion */
    completion_tokens: number;
    /** Total tokens used (prompt + completion) */
    total_tokens: number;
  };
}

/**
 * Response format configuration for OpenRouter API
 */
export interface ResponseFormat {
  /** Must be 'json_schema' for structured outputs */
  type: "json_schema";
  /** JSON schema configuration */
  json_schema: {
    /** Schema name */
    name: string;
    /** Enforce strict adherence to schema */
    strict: true;
    /** JSON Schema object */
    schema: object;
  };
}

/**
 * Internal request structure for OpenRouter API
 */
export interface OpenRouterRequest {
  /** Model identifier (e.g., 'openai/gpt-4-vision-preview') */
  model: string;
  /** Array of messages (system, user, assistant) */
  messages: Message[];
  /** Response format configuration */
  response_format: ResponseFormat;
  /** Temperature parameter */
  temperature?: number;
  /** Maximum tokens parameter */
  max_tokens?: number;
  /** Top-p parameter */
  top_p?: number;
}

/**
 * Message structure for OpenRouter API
 */
export interface Message {
  /** Role of the message sender */
  role: "system" | "user" | "assistant";
  /** Message content - can be string or multimodal array */
  content: string | MessageContent[];
}

/**
 * Raw response from OpenRouter API
 */
export interface OpenRouterAPIResponse {
  /** Response ID */
  id: string;
  /** Model used */
  model: string;
  /** Array of completion choices */
  choices: {
    /** Index of the choice */
    index: number;
    /** Message content */
    message: {
      /** Role (typically 'assistant') */
      role: string;
      /** Content of the response */
      content: string;
    };
    /** Finish reason */
    finish_reason: string;
  }[];
  /** Token usage statistics */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Error response from OpenRouter API
 */
export interface OpenRouterAPIError {
  error: {
    /** Error message */
    message: string;
    /** Error type */
    type?: string;
    /** Error code */
    code?: string;
  };
}

# OpenRouter Service Implementation Plan

## 1. Service Description

The OpenRouter service is a TypeScript-based client for interacting with the OpenRouter API to perform LLM-based chat completions. This service will be used primarily for extracting structured data from receipt images in the Paragoniusz application.

**Key Responsibilities:**

- Send chat completion requests to OpenRouter API
- Handle system and user messages (including images)
- Configure structured JSON responses via JSON schema
- Manage model selection and parameters
- Handle errors, timeouts, and validation
- Ensure secure API key management

**Location:** `src/lib/services/openrouter.service.ts`

**Dependencies:**

- `zod` for schema validation
- Native `fetch` API for HTTP requests
- TypeScript 5 for type safety

## 2. Constructor Description

The service should be instantiated with configuration options that allow flexibility while maintaining security.

```typescript
interface OpenRouterConfig {
  apiKey: string;           // API key from environment variables
  baseUrl?: string;         // Default: 'https://openrouter.ai/api/v1'
  timeout?: number;         // Default: 20000 (20 seconds per PRD requirement)
  defaultModel?: string;    // Default model to use
  retryAttempts?: number;   // Number of retry attempts for transient failures
}

constructor(config: OpenRouterConfig)
```

**Implementation Notes:**

- API key MUST be passed from environment variables, never hardcoded
- Timeout default aligns with PRD 3.4 requirement (20 seconds)
- Base URL allows for testing with mock servers
- Default model can be overridden per request

## 3. Public Methods and Fields

### 3.1 Main Chat Completion Method

```typescript
async chatCompletion<T>(options: ChatCompletionOptions): Promise<ChatCompletionResponse<T>>
```

**Purpose:** Send a chat completion request with structured response format.

**Parameters:**

```typescript
interface ChatCompletionOptions {
  systemMessage: string; // System prompt for AI behavior
  userMessage: string | MessageContent[]; // User message (text or multimodal)
  responseSchema: ResponseSchema; // JSON schema for structured output
  model?: string; // Override default model
  parameters?: ModelParameters; // Model-specific parameters
}

interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string; // Base64 data URI or HTTP(S) URL
  };
}

interface ResponseSchema {
  name: string; // Schema name (e.g., 'receipt_extraction')
  schema: object; // JSON Schema object
}

interface ModelParameters {
  temperature?: number; // 0.0 to 2.0, default: 0.1 for extraction
  max_tokens?: number; // Maximum tokens in response
  top_p?: number; // Nucleus sampling parameter
}

interface ChatCompletionResponse<T> {
  data: T; // Parsed and validated response data
  model: string; // Model used for completion
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

**Example Usage:**

```typescript
const openRouter = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  timeout: 20000,
});

const result = await openRouter.chatCompletion<ReceiptData>({
  systemMessage: "You are an expert at extracting data from Polish receipts.",
  userMessage: [
    { type: "text", text: "Extract all items from this receipt" },
    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
  ],
  responseSchema: {
    name: "receipt_extraction",
    schema: receiptExtractionSchema,
  },
  model: "openai/gpt-4-vision-preview",
  parameters: {
    temperature: 0.1,
    max_tokens: 2000,
  },
});
```

### 3.2 Helper Method: Build Response Format

```typescript
buildResponseFormat(schema: ResponseSchema): ResponseFormat
```

**Purpose:** Construct properly formatted response_format object for OpenRouter API.

**Returns:**

```typescript
interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: object;
  };
}
```

**Implementation:**

```typescript
buildResponseFormat(schema: ResponseSchema): ResponseFormat {
  return {
    type: 'json_schema',
    json_schema: {
      name: schema.name,
      strict: true,
      schema: schema.schema
    }
  };
}
```

### 3.3 Validation Method

```typescript
validateResponse<T>(response: unknown, zodSchema: z.ZodSchema<T>): T
```

**Purpose:** Validate API response against Zod schema.

**Parameters:**

- `response`: Raw response data from API
- `zodSchema`: Zod schema for validation

**Returns:** Validated and typed data

**Throws:** `ValidationError` if validation fails

## 4. Private Methods and Fields

### 4.1 Private Fields

```typescript
private readonly apiKey: string;
private readonly baseUrl: string;
private readonly timeout: number;
private readonly defaultModel: string;
private readonly retryAttempts: number;
```

### 4.2 Build Request Method

```typescript
private buildRequest(options: ChatCompletionOptions): OpenRouterRequest
```

**Purpose:** Construct the complete request body for OpenRouter API.

**Returns:**

```typescript
interface OpenRouterRequest {
  model: string;
  messages: Message[];
  response_format: ResponseFormat;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string | MessageContent[];
}
```

**Implementation Logic:**

1. Create messages array starting with system message
2. Add user message (handle both string and multimodal content)
3. Build response_format using helper method
4. Merge model parameters with defaults
5. Validate all required fields are present

### 4.3 Execute Request Method

```typescript
private async executeRequest(request: OpenRouterRequest): Promise<unknown>
```

**Purpose:** Execute HTTP request with timeout and error handling.

**Implementation Steps:**

1. Create AbortController for timeout management
2. Set timeout using setTimeout
3. Execute fetch with proper headers:
   ```typescript
   {
     'Authorization': `Bearer ${this.apiKey}`,
     'Content-Type': 'application/json',
     'HTTP-Referer': 'https://paragoniusz.app',
     'X-Title': 'Paragoniusz'
   }
   ```
4. Handle response status codes
5. Parse JSON response
6. Clear timeout
7. Return response data

### 4.4 Handle Error Method

```typescript
private handleError(error: unknown): never
```

**Purpose:** Convert various error types into custom error classes.

**Error Classification:**

- Network errors → `NetworkError`
- Timeout errors → `TimeoutError`
- HTTP 401/403 → `AuthenticationError`
- HTTP 429 → `RateLimitError`
- HTTP 400 → `ValidationError`
- HTTP 500+ → `APIError`
- Other → `UnknownError`

### 4.5 Retry Logic Method

```typescript
private async withRetry<T>(
  operation: () => Promise<T>,
  attempts: number = this.retryAttempts
): Promise<T>
```

**Purpose:** Retry transient failures with exponential backoff.

**Retry Conditions:**

- Network errors
- HTTP 429 (rate limit)
- HTTP 500+ (server errors)

**Non-Retry Conditions:**

- Authentication errors
- Validation errors
- Timeout errors (already at max time)

**Backoff Formula:** `delay = baseDelay * (2 ^ attemptNumber)`

## 5. Error Handling

### 5.1 Custom Error Classes

Create custom error classes in `src/lib/errors/openrouter.errors.ts`:

```typescript
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export class NetworkError extends OpenRouterError {
  constructor(message: string = "Network request failed") {
    super(message, "NETWORK_ERROR");
  }
}

export class TimeoutError extends OpenRouterError {
  constructor(message: string = "Request timeout after 20 seconds") {
    super(message, "TIMEOUT_ERROR");
  }
}

export class AuthenticationError extends OpenRouterError {
  constructor(message: string = "Invalid API key") {
    super(message, "AUTH_ERROR", 401);
  }
}

export class RateLimitError extends OpenRouterError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, "RATE_LIMIT_ERROR", 429);
  }
}

export class ValidationError extends OpenRouterError {
  constructor(
    message: string,
    public readonly validationErrors?: unknown
  ) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

export class APIError extends OpenRouterError {
  constructor(message: string, statusCode: number) {
    super(message, "API_ERROR", statusCode);
  }
}
```

### 5.2 Error Handling Strategy

**At Service Level:**

1. Catch all errors in `executeRequest`
2. Classify using `handleError` method
3. Throw appropriate custom error
4. Log errors with sanitized data (no API keys)

**At Consumer Level (Edge Function):**

1. Catch service errors
2. Map to user-friendly messages
3. Return appropriate HTTP status codes
4. Log for debugging

**Example Error Mapping:**

```typescript
try {
  const result = await openRouter.chatCompletion(options);
  return result;
} catch (error) {
  if (error instanceof TimeoutError) {
    return { error: "Processing took too long. Please try again." };
  }
  if (error instanceof ValidationError) {
    return { error: "Invalid receipt format. Please try a clearer image." };
  }
  if (error instanceof RateLimitError) {
    return { error: "Too many requests. Please wait a moment." };
  }
  return { error: "Failed to process receipt. Please try again." };
}
```

## 6. Security Considerations

### 6.1 API Key Management

**CRITICAL RULES:**

1. NEVER store API key in frontend code
2. NEVER commit API key to version control
3. ALWAYS use environment variables
4. ONLY access API key in Edge Functions (server-side)

**Implementation:**

```typescript
// In Edge Function (supabase/functions/process-receipt/index.ts)
const openRouter = new OpenRouterService({
  apiKey: Deno.env.get("OPENROUTER_API_KEY")!,
});
```

### 6.2 Input Validation

**Validate Before Sending:**

1. Check image size (max 20MB recommended)
2. Validate image format (JPEG, PNG, WebP)
3. Sanitize user text inputs
4. Validate schema structure

### 6.3 Rate Limiting

**Implement at Edge Function Level:**

- Track requests per user
- Limit to 10 requests per minute
- Return 429 status when exceeded

## 7. Step-by-Step Implementation Plan

### Step 1: Create Type Definitions

**File:** `src/types/openrouter.types.ts`

- Define all interfaces for config, options, messages, responses

### Step 2: Create Error Classes

**File:** `src/lib/errors/openrouter.errors.ts`

- Implement all custom error classes

### Step 3: Implement Service Constructor

**File:** `src/lib/services/openrouter.service.ts`

- Create class with validation

### Step 4: Implement Helper Methods

- `buildResponseFormat`
- `validateImageUrl`
- `sanitizeInput`

### Step 5: Implement Request Builder

- `buildRequest` method with full message handling

### Step 6: Implement HTTP Execution

- `executeRequest` with timeout and error handling

### Step 7: Implement Error Handling

- `handleError` method with classification

### Step 8: Implement Retry Logic

- `withRetry` with exponential backoff

### Step 9: Implement Main Method

- `chatCompletion` tying everything together

### Step 10: Create Zod Schemas

**File:** `src/lib/validation/receipt.validation.ts`

- Define receipt data schemas

### Step 11: Create Edge Function

**File:** `supabase/functions/process-receipt/index.ts`

- Integrate service with rate limiting

### Step 12: Testing

- Unit tests for all methods
- Integration tests with mocks
- E2E tests with real images

### Step 13: Documentation

- JSDoc comments
- Usage examples
- Troubleshooting guide

### Step 14: Deployment

- Configure environment variables
- Verify security measures
- Deploy and monitor

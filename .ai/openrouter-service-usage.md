# OpenRouter Service - Usage Guide

## Overview

The OpenRouter service provides a TypeScript client for interacting with the OpenRouter API to perform LLM-based chat completions with structured JSON responses. It's primarily used for extracting structured data from receipt images in the Paragoniusz application.

## Architecture

```
┌─────────────────┐
│  Frontend/API   │
│   (Astro)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Edge Function  │
│ (process-receipt)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OpenRouter      │
│   Service       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OpenRouter API │
│   (External)    │
└─────────────────┘
```

## Files Structure

```
src/
├── types/
│   └── openrouter.types.ts          # TypeScript type definitions
├── lib/
│   ├── errors/
│   │   └── openrouter.errors.ts     # Custom error classes
│   ├── services/
│   │   └── openrouter.service.ts    # Main service implementation
│   └── validation/
│       └── receipt.validation.ts     # Zod schemas and JSON schemas
└── supabase/
    └── functions/
        └── process-receipt/
            └── index.ts              # Edge Function integration
```

## Environment Variables

### Required Variables

Add these to your `.env` file and Supabase secrets:

```bash
# OpenRouter API Key (get from https://openrouter.ai)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# Supabase Configuration (already configured)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Setting Supabase Secrets

```bash
# Set the OpenRouter API key in Supabase
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# Verify secrets
supabase secrets list
```

## Usage Examples

### 1. Basic Usage (Direct Service)

```typescript
import { OpenRouterService } from "@/lib/services/openrouter.service";
import { receiptExtractionJsonSchema } from "@/lib/validation/receipt.validation";
import type { ReceiptData } from "@/lib/validation/receipt.validation";

// Initialize service (server-side only!)
const openRouter = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  timeout: 20000,
  defaultModel: "openai/gpt-4-vision-preview",
  retryAttempts: 3,
});

// Process receipt
const result = await openRouter.chatCompletion<ReceiptData>({
  systemMessage: "You are an expert at extracting data from Polish receipts.",
  userMessage: [
    { type: "text", text: "Extract all items from this receipt" },
    {
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${base64Image}` },
    },
  ],
  responseSchema: {
    name: "receipt_extraction",
    schema: receiptExtractionJsonSchema,
  },
  parameters: {
    temperature: 0.1,
    max_tokens: 2000,
  },
});

console.log(result.data); // Typed as ReceiptData
// {
//   items: [
//     { name: "Mleko", amount: 4.99, category: "Żywność" },
//     { name: "Chleb", amount: 3.50, category: "Żywność" }
//   ],
//   total: 8.49,
//   date: "2024-01-15"
// }
```

### 2. Using the Edge Function (Recommended)

```typescript
// Frontend code (React/Astro)
async function processReceipt(filePath: string) {
  const response = await fetch("/functions/v1/process-receipt", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_path: filePath }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to process receipt");
  }

  const receiptData = await response.json();
  return receiptData;
}

// Usage
try {
  const data = await processReceipt("receipts/user-id/receipt-id.jpg");
  console.log("Extracted items:", data.items);
} catch (error) {
  console.error("Processing failed:", error.message);
}
```

### 3. Error Handling

```typescript
import {
  TimeoutError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  NetworkError,
} from "@/lib/errors/openrouter.errors";

try {
  const result = await openRouter.chatCompletion(options);
  return result;
} catch (error) {
  if (error instanceof TimeoutError) {
    // Request took too long (>20 seconds)
    return { error: "Processing took too long. Please try again." };
  }

  if (error instanceof AuthenticationError) {
    // Invalid API key
    console.error("API key issue:", error.message);
    return { error: "Service configuration error" };
  }

  if (error instanceof ValidationError) {
    // Invalid request or response format
    return { error: "Invalid receipt format. Please try a clearer image." };
  }

  if (error instanceof RateLimitError) {
    // Too many requests
    return { error: "Too many requests. Please wait a moment." };
  }

  if (error instanceof NetworkError) {
    // Network connectivity issues
    return { error: "Network error. Please check your connection." };
  }

  // Generic fallback
  return { error: "Failed to process receipt. Please try again." };
}
```

## API Reference

### OpenRouterService

#### Constructor

```typescript
constructor(config: OpenRouterConfig)
```

**Parameters:**

- `config.apiKey` (required): OpenRouter API key
- `config.baseUrl` (optional): API base URL (default: 'https://openrouter.ai/api/v1')
- `config.timeout` (optional): Request timeout in ms (default: 20000)
- `config.defaultModel` (optional): Default model (default: 'openai/gpt-4-vision-preview')
- `config.retryAttempts` (optional): Retry attempts (default: 3)

#### Methods

##### `chatCompletion<T>(options: ChatCompletionOptions): Promise<ChatCompletionResponse<T>>`

Performs a chat completion with structured JSON response.

**Parameters:**

- `options.systemMessage`: System prompt defining AI behavior
- `options.userMessage`: User message (text or multimodal array)
- `options.responseSchema`: JSON schema for structured output
- `options.model`: Model to use (optional, overrides default)
- `options.parameters`: Model parameters (optional)

**Returns:** Promise resolving to `ChatCompletionResponse<T>` with typed data

**Throws:**

- `TimeoutError`: Request exceeds timeout
- `AuthenticationError`: Invalid API key
- `ValidationError`: Invalid request/response
- `RateLimitError`: Rate limit exceeded
- `APIError`: Other API errors
- `NetworkError`: Network failures

##### `buildResponseFormat(schema: ResponseSchema): ResponseFormat`

Constructs properly formatted response_format object.

**Parameters:**

- `schema.name`: Schema name
- `schema.schema`: JSON Schema object

**Returns:** Formatted response_format for OpenRouter API

## Testing

### Unit Tests

Create tests for the service methods:

```typescript
// tests/openrouter.service.test.ts
import { describe, it, expect, vi } from "vitest";
import { OpenRouterService } from "@/lib/services/openrouter.service";
import { ValidationError, TimeoutError } from "@/lib/errors/openrouter.errors";

describe("OpenRouterService", () => {
  it("should throw ValidationError if API key is missing", () => {
    expect(() => {
      new OpenRouterService({ apiKey: "" });
    }).toThrow(ValidationError);
  });

  it("should build response format correctly", () => {
    const service = new OpenRouterService({ apiKey: "test-key" });
    const format = service.buildResponseFormat({
      name: "test_schema",
      schema: { type: "object" },
    });

    expect(format.type).toBe("json_schema");
    expect(format.json_schema.name).toBe("test_schema");
    expect(format.json_schema.strict).toBe(true);
  });

  it("should handle timeout errors", async () => {
    const service = new OpenRouterService({
      apiKey: "test-key",
      timeout: 1, // 1ms timeout
    });

    await expect(
      service.chatCompletion({
        systemMessage: "test",
        userMessage: "test",
        responseSchema: { name: "test", schema: {} },
      })
    ).rejects.toThrow(TimeoutError);
  });
});
```

### Integration Tests

Test with mock OpenRouter API:

```typescript
// tests/integration/receipt-processing.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { OpenRouterService } from "@/lib/services/openrouter.service";
import { receiptExtractionJsonSchema } from "@/lib/validation/receipt.validation";

describe("Receipt Processing Integration", () => {
  let service: OpenRouterService;

  beforeAll(() => {
    service = new OpenRouterService({
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseUrl: "http://localhost:3001/mock", // Mock server
    });
  });

  it("should extract receipt data from image", async () => {
    const mockBase64 = "base64-encoded-image-data";

    const result = await service.chatCompletion({
      systemMessage: "Extract receipt data",
      userMessage: [
        { type: "text", text: "Extract items" },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${mockBase64}` } },
      ],
      responseSchema: {
        name: "receipt_extraction",
        schema: receiptExtractionJsonSchema,
      },
    });

    expect(result.data).toHaveProperty("items");
    expect(result.data).toHaveProperty("total");
    expect(result.data).toHaveProperty("date");
    expect(Array.isArray(result.data.items)).toBe(true);
  });
});
```

### E2E Tests

Test the complete flow with real receipts:

```typescript
// tests/e2e/receipt-flow.test.ts
import { test, expect } from "@playwright/test";

test("complete receipt processing flow", async ({ page }) => {
  // Login
  await page.goto("/login");
  await page.fill('[name="email"]', "test@example.com");
  await page.fill('[name="password"]', "password123");
  await page.click('button[type="submit"]');

  // Navigate to scan page
  await page.goto("/expenses/scan");

  // Upload receipt
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles("./tests/fixtures/sample-receipt.jpg");

  // Wait for processing
  await page.waitForSelector('[data-testid="processing-complete"]', {
    timeout: 25000, // Allow for 20s timeout + buffer
  });

  // Verify extracted data
  const items = await page.locator('[data-testid="receipt-item"]').count();
  expect(items).toBeGreaterThan(0);

  const total = await page.locator('[data-testid="receipt-total"]').textContent();
  expect(total).toMatch(/\d+\.\d{2}/);
});
```

## Deployment Checklist

Before deploying to production:

- [ ] Set `OPENROUTER_API_KEY` in Supabase secrets
- [ ] Verify API key has sufficient credits
- [ ] Test Edge Function locally: `supabase functions serve process-receipt`
- [ ] Deploy Edge Function: `supabase functions deploy process-receipt`
- [ ] Test with real receipt images
- [ ] Monitor error rates and response times
- [ ] Set up alerts for rate limit errors
- [ ] Configure logging for debugging

## Troubleshooting

### Common Issues

#### 1. "Invalid API key" Error

**Cause:** API key not set or incorrect

**Solution:**

```bash
# Verify environment variable
echo $OPENROUTER_API_KEY

# Set in Supabase
supabase secrets set OPENROUTER_API_KEY=your-key-here
```

#### 2. Timeout Errors

**Cause:** Image too large or complex, slow network

**Solution:**

- Reduce image size before upload
- Compress images (JPEG quality 80-90%)
- Check network connectivity
- Consider increasing timeout (not recommended beyond 20s)

#### 3. Rate Limit Errors

**Cause:** Too many requests to OpenRouter

**Solution:**

- Implement client-side rate limiting
- Add exponential backoff
- Consider upgrading OpenRouter plan
- Cache results when possible

#### 4. Invalid Response Format

**Cause:** AI didn't follow schema, image unclear

**Solution:**

- Improve system message clarity
- Use clearer receipt images
- Add validation and retry logic
- Consider using a different model

### Monitoring

Monitor these metrics:

- **Success Rate**: % of successful extractions
- **Average Response Time**: Should be < 15 seconds
- **Error Rate by Type**: Track which errors are most common
- **Token Usage**: Monitor costs
- **Rate Limit Hits**: Track when limits are reached

### Logging

The service logs errors with sanitized data:

```typescript
// Errors are logged without exposing API keys
console.error("OpenRouter error:", {
  code: error.code,
  message: error.message,
  statusCode: error.statusCode,
  // API key is never logged
});
```

## Best Practices

1. **Always use server-side**: Never expose API key in frontend code
2. **Implement rate limiting**: Protect against abuse
3. **Validate inputs**: Check image size and format before processing
4. **Handle errors gracefully**: Provide user-friendly error messages
5. **Monitor usage**: Track costs and performance
6. **Cache when possible**: Avoid reprocessing same receipts
7. **Use appropriate models**: Balance cost vs accuracy
8. **Test thoroughly**: Use real receipt images in tests
9. **Set reasonable timeouts**: 20 seconds is recommended
10. **Clean up resources**: Delete images after processing

## Support

For issues or questions:

- Check the implementation plan: `.ai/openrouter-service-implementation-plan.md`
- Review error logs in Supabase dashboard
- Test with OpenRouter playground: https://openrouter.ai/playground
- Check OpenRouter status: https://status.openrouter.ai

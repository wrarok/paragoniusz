# API Endpoint Implementation Plan: Process Receipt with AI

## 1. Endpoint Overview

This endpoint processes an uploaded receipt image using AI to extract expense data. It acts as a secure gateway between the client application and the Supabase Edge Function that communicates with OpenRouter.ai. The endpoint enforces user consent for AI processing, validates file access permissions, and ensures the receipt image is deleted after processing (per PRD 3.4 requirement).

**Key Characteristics:**

- Requires authentication via Bearer token
- Enforces AI consent check before processing
- Implements 20-second timeout for AI processing
- Automatically deletes receipt after successful processing
- Returns structured expense data grouped by categories

## 2. Request Details

### HTTP Method

POST

### URL Structure

`/api/receipts/process`

### Headers

- `Authorization: Bearer {access_token}` (required)
- `Content-Type: application/json` (required)

### Request Body

```typescript
{
  "file_path": "receipts/user_id/uuid.jpg"
}
```

### Parameters

**Required:**

- `file_path` (string): Path to the uploaded receipt file in Supabase Storage
  - Format: `receipts/{user_id}/{uuid}.{ext}`
  - Must be a valid path to an existing file
  - File must belong to the authenticated user

**Optional:**

- None

## 3. Used Types

### Input Types

```typescript
// From src/types.ts (line 224-226)
type ProcessReceiptCommand = {
  file_path: string;
};
```

### Output Types

```typescript
// From src/types.ts (line 213-218)
type ReceiptExpenseDTO = {
  category_id: string;
  category_name: string;
  amount: string;
  items: string[];
};

// From src/types.ts (line 232-238)
type ProcessReceiptResponseDTO = {
  expenses: ReceiptExpenseDTO[];
  total_amount: string;
  currency: string;
  receipt_date: string; // YYYY-MM-DD format
  processing_time_ms: number;
};
```

### Error Types

```typescript
// From src/types.ts (line 248-254)
type APIErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

### Validation Schema (to be created)

```typescript
// In src/lib/validation/receipt.validation.ts
import { z } from "zod";

export const processReceiptSchema = z.object({
  file_path: z
    .string()
    .min(1, "File path is required")
    .regex(/^receipts\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i, "Invalid file path format"),
});
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "expenses": [
    {
      "category_id": "uuid",
      "category_name": "Groceries",
      "amount": "35.50",
      "items": ["Milk 2L - 5.50", "Bread - 4.00", "Eggs 10pcs - 12.00", "Cheese 200g - 14.00"]
    },
    {
      "category_id": "uuid",
      "category_name": "Household",
      "amount": "15.20",
      "items": ["Dish soap - 8.50", "Paper towels - 6.70"]
    }
  ],
  "total_amount": "50.70",
  "currency": "PLN",
  "receipt_date": "2024-01-15",
  "processing_time_ms": 3500
}
```

### Error Responses

**401 Unauthorized**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired authentication token"
  }
}
```

**400 Bad Request**

```json
{
  "error": {
    "code": "INVALID_FILE_PATH",
    "message": "Invalid file path format or file not found",
    "details": {
      "file_path": "receipts/user_id/uuid.jpg"
    }
  }
}
```

**403 Forbidden**

```json
{
  "error": {
    "code": "AI_CONSENT_REQUIRED",
    "message": "AI processing consent has not been given. Please enable AI features in settings."
  }
}
```

**408 Request Timeout**

```json
{
  "error": {
    "code": "PROCESSING_TIMEOUT",
    "message": "AI processing exceeded the 20-second timeout limit. Please try again with a clearer image."
  }
}
```

**422 Unprocessable Entity**

```json
{
  "error": {
    "code": "EXTRACTION_FAILED",
    "message": "Unable to extract expense data from the receipt. Please ensure the image is clear and contains a valid receipt.",
    "details": {
      "reason": "No text detected in image"
    }
  }
}
```

**500 Internal Server Error**

```json
{
  "error": {
    "code": "AI_SERVICE_ERROR",
    "message": "An error occurred while processing the receipt. Please try again later.",
    "details": {
      "service": "edge_function"
    }
  }
}
```

## 5. Data Flow

### High-Level Flow

```
Client → API Endpoint → Validation → AI Consent Check →
Edge Function → OpenRouter AI → Response Processing →
File Cleanup → Client Response
```

### Detailed Steps

1. **Request Reception**
   - Receive POST request with `file_path` in body
   - Extract Bearer token from Authorization header

2. **Authentication**
   - Validate JWT token using Supabase client from `context.locals`
   - Extract `user_id` from authenticated session
   - Return 401 if authentication fails

3. **Input Validation**
   - Validate request body against `processReceiptSchema`
   - Check file_path format matches pattern
   - Return 400 if validation fails

4. **AI Consent Verification**
   - Query `profiles` table for user's `ai_consent_given` status
   - Return 403 if consent is false or not set

5. **File Ownership Verification**
   - Extract user_id from file_path
   - Compare with authenticated user_id
   - Return 403 if user_ids don't match (security check)

6. **File Existence Check**
   - Check if file exists in Supabase Storage
   - Return 400 if file not found

7. **Edge Function Invocation**
   - Call Supabase Edge Function `process-receipt`
   - Pass file_path and user_id
   - Implement 20-second timeout
   - Return 408 if timeout occurs

8. **Edge Function Processing** (handled by Edge Function)
   - Download image from Supabase Storage
   - Call OpenRouter.ai with image
   - Parse AI response into structured format
   - Return structured data or error

9. **Response Handling**
   - Receive response from Edge Function
   - Handle different error scenarios:
     - 422: AI couldn't extract data
     - 500: Edge Function or AI service error

10. **File Cleanup**
    - Delete receipt file from Supabase Storage
    - Log if deletion fails (non-blocking)

11. **Response Formation**
    - Format response as `ProcessReceiptResponseDTO`
    - Return 200 with processed data

### Database Interactions

1. **Read from `profiles` table**

   ```sql
   SELECT ai_consent_given
   FROM profiles
   WHERE id = {user_id}
   ```

2. **Read from `categories` table** (via Edge Function)

   ```sql
   SELECT id, name
   FROM categories
   ```

3. **Storage Operations**
   - Check file existence: `storage.from('receipts').exists(file_path)`
   - Delete file: `storage.from('receipts').remove([file_path])`

## 6. Security Considerations

### Authentication & Authorization

- **JWT Validation**: Verify Bearer token using Supabase client
- **User Context**: Extract user_id from authenticated session
- **File Ownership**: Ensure file_path contains authenticated user's ID
- **Consent Enforcement**: Block processing if AI consent not given

### Input Validation

- **Path Traversal Prevention**: Validate file_path against strict regex pattern
- **File Type Restriction**: Only allow image extensions (jpg, jpeg, png, webp)
- **Path Format**: Enforce `receipts/{user_id}/{uuid}.{ext}` structure

### Data Protection

- **Temporary Storage**: Receipt images stored only during processing
- **Automatic Cleanup**: Delete files immediately after processing
- **No Persistence**: Never store receipt images long-term (PRD 3.4)

### API Security

- **Rate Limiting**: Consider implementing rate limits (future enhancement)
- **Timeout Protection**: 20-second hard timeout prevents resource exhaustion
- **Error Information**: Don't expose internal system details in error messages

### Edge Function Security

- **API Key Protection**: OpenRouter API key stored in Edge Function environment
- **Server-Side Processing**: All AI communication happens server-side
- **No Client Exposure**: Client never has direct access to AI service

## 7. Error Handling

### Error Handling Strategy

- Use early returns for error conditions
- Implement guard clauses at function start
- Log all errors for monitoring
- Return standardized `APIErrorResponse` format
- Provide user-friendly error messages

### Error Scenarios

| Scenario                       | Status Code | Error Code          | Action                            |
| ------------------------------ | ----------- | ------------------- | --------------------------------- |
| Missing Authorization header   | 401         | UNAUTHORIZED        | Return error immediately          |
| Invalid/expired JWT token      | 401         | UNAUTHORIZED        | Return error immediately          |
| Missing file_path in body      | 400         | INVALID_REQUEST     | Return validation error           |
| Invalid file_path format       | 400         | INVALID_FILE_PATH   | Return validation error           |
| File not found in storage      | 400         | FILE_NOT_FOUND      | Return error with file_path       |
| File belongs to different user | 403         | FORBIDDEN           | Return error (security)           |
| AI consent not given           | 403         | AI_CONSENT_REQUIRED | Return error with guidance        |
| Edge Function timeout (>20s)   | 408         | PROCESSING_TIMEOUT  | Return timeout error              |
| AI extraction failed           | 422         | EXTRACTION_FAILED   | Return error with reason          |
| Edge Function error            | 500         | AI_SERVICE_ERROR    | Log error, return generic message |
| OpenRouter API error           | 500         | AI_SERVICE_ERROR    | Log error, return generic message |
| Database query error           | 500         | INTERNAL_ERROR      | Log error, return generic message |
| File deletion error            | N/A         | N/A                 | Log warning (non-blocking)        |

### Error Logging

```typescript
// Log structure for monitoring
{
  timestamp: new Date().toISOString(),
  endpoint: '/api/receipts/process',
  user_id: string,
  error_code: string,
  error_message: string,
  file_path?: string,
  stack_trace?: string
}
```

## 8. Performance Considerations

### Potential Bottlenecks

1. **AI Processing Time**: OpenRouter API calls can take 5-15 seconds
2. **File Download**: Large images increase Edge Function processing time
3. **Network Latency**: Communication between services adds overhead
4. **Storage Operations**: File existence checks and deletion add latency

### Optimization Strategies

1. **Timeout Management**: Strict 20-second timeout prevents hanging requests
2. **Async Operations**: Use async/await for all I/O operations
3. **Early Validation**: Validate inputs before expensive operations
4. **Efficient Queries**: Use indexed queries for profile lookup
5. **Error Fast-Path**: Return errors immediately without unnecessary processing

### Monitoring Metrics

- Track `processing_time_ms` in responses
- Monitor Edge Function execution time
- Track success/failure rates
- Monitor timeout occurrences
- Track AI consent rejection rate

## 9. Implementation Steps

### Step 1: Create Validation Schema

**File**: `src/lib/validation/receipt.validation.ts`

Add validation schema for process receipt request:

```typescript
import { z } from "zod";

export const processReceiptSchema = z.object({
  file_path: z
    .string()
    .min(1, "File path is required")
    .regex(
      /^receipts\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i,
      "Invalid file path format. Expected: receipts/{user_id}/{uuid}.{ext}"
    ),
});
```

### Step 2: Extend Receipt Service

**File**: `src/lib/services/receipt.service.ts`

Add method to process receipt via Edge Function:

```typescript
import type { SupabaseClient } from "../db/supabase.client";
import type { ProcessReceiptResponseDTO } from "../types";

export class ReceiptService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Process receipt image using AI via Edge Function
   * @param filePath - Path to receipt file in storage
   * @param userId - Authenticated user ID
   * @returns Processed receipt data with expenses
   * @throws Error if processing fails
   */
  async processReceipt(filePath: string, userId: string): Promise<ProcessReceiptResponseDTO> {
    // Verify AI consent
    const { data: profile, error: profileError } = await this.supabase
      .from("profiles")
      .select("ai_consent_given")
      .eq("id", userId)
      .single();

    if (profileError) {
      throw new Error("Failed to fetch user profile");
    }

    if (!profile.ai_consent_given) {
      throw new Error("AI_CONSENT_REQUIRED");
    }

    // Verify file ownership
    const fileUserId = filePath.split("/")[1];
    if (fileUserId !== userId) {
      throw new Error("FORBIDDEN");
    }

    // Check file exists
    const { data: fileExists, error: storageError } = await this.supabase.storage.from("receipts").list(fileUserId, {
      search: filePath.split("/")[2],
    });

    if (storageError || !fileExists || fileExists.length === 0) {
      throw new Error("FILE_NOT_FOUND");
    }

    // Call Edge Function with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const { data, error } = await this.supabase.functions.invoke("process-receipt", {
        body: { file_path: filePath },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (error) {
        if (error.message?.includes("timeout") || error.message?.includes("aborted")) {
          throw new Error("PROCESSING_TIMEOUT");
        }
        throw new Error("AI_SERVICE_ERROR");
      }

      // Delete receipt file after successful processing
      try {
        await this.supabase.storage.from("receipts").remove([filePath]);
      } catch (deleteError) {
        // Log but don't fail the request
        console.warn("Failed to delete receipt file:", deleteError);
      }

      return data as ProcessReceiptResponseDTO;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("PROCESSING_TIMEOUT");
      }
      throw error;
    }
  }
}
```

### Step 3: Create API Endpoint

**File**: `src/pages/api/receipts/process.ts`

Create the POST endpoint handler:

```typescript
import type { APIRoute } from "astro";
import { processReceiptSchema } from "../../../lib/validation/receipt.validation";
import { ReceiptService } from "../../../lib/services/receipt.service";
import type { APIErrorResponse, ProcessReceiptResponseDTO } from "../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Authentication check
    const {
      data: { session },
      error: authError,
    } = await locals.supabase.auth.getSession();

    if (authError || !session) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired authentication token",
          },
        } as APIErrorResponse),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = session.user.id;

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid JSON in request body",
          },
        } as APIErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validation = processReceiptSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_FILE_PATH",
            message: validation.error.errors[0].message,
            details: { file_path: body.file_path },
          },
        } as APIErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process receipt
    const receiptService = new ReceiptService(locals.supabase);

    try {
      const result = await receiptService.processReceipt(validation.data.file_path, userId);

      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      // Handle specific service errors
      if (error instanceof Error) {
        switch (error.message) {
          case "AI_CONSENT_REQUIRED":
            return new Response(
              JSON.stringify({
                error: {
                  code: "AI_CONSENT_REQUIRED",
                  message: "AI processing consent has not been given. Please enable AI features in settings.",
                },
              } as APIErrorResponse),
              { status: 403, headers: { "Content-Type": "application/json" } }
            );

          case "FORBIDDEN":
            return new Response(
              JSON.stringify({
                error: {
                  code: "FORBIDDEN",
                  message: "You do not have permission to process this file",
                },
              } as APIErrorResponse),
              { status: 403, headers: { "Content-Type": "application/json" } }
            );

          case "FILE_NOT_FOUND":
            return new Response(
              JSON.stringify({
                error: {
                  code: "FILE_NOT_FOUND",
                  message: "Receipt file not found in storage",
                  details: { file_path: validation.data.file_path },
                },
              } as APIErrorResponse),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );

          case "PROCESSING_TIMEOUT":
            return new Response(
              JSON.stringify({
                error: {
                  code: "PROCESSING_TIMEOUT",
                  message: "AI processing exceeded the 20-second timeout limit. Please try again with a clearer image.",
                },
              } as APIErrorResponse),
              { status: 408, headers: { "Content-Type": "application/json" } }
            );

          case "EXTRACTION_FAILED":
            return new Response(
              JSON.stringify({
                error: {
                  code: "EXTRACTION_FAILED",
                  message:
                    "Unable to extract expense data from the receipt. Please ensure the image is clear and contains a valid receipt.",
                },
              } as APIErrorResponse),
              { status: 422, headers: { "Content-Type": "application/json" } }
            );

          case "AI_SERVICE_ERROR":
            console.error("AI service error:", error);
            return new Response(
              JSON.stringify({
                error: {
                  code: "AI_SERVICE_ERROR",
                  message: "An error occurred while processing the receipt. Please try again later.",
                  details: { service: "edge_function" },
                },
              } as APIErrorResponse),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
      }

      // Generic error handler
      console.error("Unexpected error processing receipt:", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred. Please try again later.",
          },
        } as APIErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Fatal error in receipt processing endpoint:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again later.",
        },
      } as APIErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

### Step 4: Create Supabase Edge Function

**File**: `supabase/functions/process-receipt/index.ts`

Create the Edge Function that communicates with OpenRouter:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  try {
    const { file_path } = await req.json();

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // Download image from storage
    const { data: imageData, error: downloadError } = await supabase.storage.from("receipts").download(file_path);

    if (downloadError) {
      throw new Error("FILE_NOT_FOUND");
    }

    // Convert image to base64
    const arrayBuffer = await imageData.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Get categories for AI context
    const { data: categories } = await supabase.from("categories").select("id, name");

    const categoryList = categories?.map((c) => `${c.name} (${c.id})`).join(", ");

    // Call OpenRouter AI
    const startTime = Date.now();

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract expense data from this receipt. Group items by category and return JSON with this structure:
{
  "expenses": [
    {
      "category_id": "uuid from list",
      "category_name": "name",
      "amount": "total as string",
      "items": ["item - price", ...]
    }
  ],
  "total_amount": "total as string",
  "currency": "PLN",
  "receipt_date": "YYYY-MM-DD"
}

Available categories: ${categoryList}

If unsure about category, use the most appropriate one.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("AI_SERVICE_ERROR");
    }

    const aiResult = await aiResponse.json();
    const processingTime = Date.now() - startTime;

    // Parse AI response
    const content = aiResult.choices[0].message.content;
    let extractedData;

    try {
      extractedData = JSON.parse(content);
    } catch {
      throw new Error("EXTRACTION_FAILED");
    }

    // Validate extracted data
    if (!extractedData.expenses || extractedData.expenses.length === 0) {
      throw new Error("EXTRACTION_FAILED");
    }

    return new Response(
      JSON.stringify({
        ...extractedData,
        processing_time_ms: processingTime,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);

    const errorMessage = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

### Step 5: Update Environment Variables

**File**: `.env.example`

Add required environment variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Step 6: Testing Checklist

1. **Authentication Tests**
   - [ ] Request without Authorization header returns 401
   - [ ] Request with invalid token returns 401
   - [ ] Request with expired token returns 401

2. **Validation Tests**
   - [ ] Request without file_path returns 400
   - [ ] Request with invalid file_path format returns 400
   - [ ] Request with non-existent file returns 400

3. **Authorization Tests**
   - [ ] User without AI consent returns 403
   - [ ] User trying to process another user's file returns 403

4. **Processing Tests**
   - [ ] Valid receipt returns 200 with structured data
   - [ ] Receipt with multiple categories groups correctly
   - [ ] Processing time is included in response
   - [ ] File is deleted after successful processing

5. **Error Handling Tests**
   - [ ] Timeout after 20 seconds returns 408
   - [ ] Unreadable receipt returns 422
   - [ ] Edge Function error returns 500

6. **Security Tests**
   - [ ] Path traversal attempts are blocked
   - [ ] Cross-user file access is prevented
   - [ ] API key is never exposed to client

### Step 7: Documentation Updates

Update API documentation with:

- Endpoint specification
- Request/response examples
- Error code reference
- Integration guide for frontend
- Edge Function deployment instructions

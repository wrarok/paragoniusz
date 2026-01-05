# API Endpoint Implementation Plan: Get Single Expense

## 1. Endpoint Overview

This endpoint retrieves a single expense record by its unique identifier for the authenticated user. It returns the complete expense details including nested category information. The endpoint enforces data ownership through Row Level Security (RLS) policies and explicit user verification, ensuring users can only access their own expense records.

**Key Features:**

- Retrieves expense by UUID
- Includes nested category information
- Enforces user ownership verification
- Returns 404 for both non-existent and unauthorized access (prevents information leakage)
- Validates UUID format before database query

## 2. Request Details

### HTTP Method

`GET`

### URL Structure

`/api/expenses/{id}`

**Path Parameters:**

- `id` (required): UUID of the expense to retrieve
  - Format: Valid UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)
  - Validation: Must match UUID format pattern

### Headers

- `Authorization: Bearer {access_token}` (required)
  - Validated by Supabase middleware
  - Must be a valid, non-expired JWT token

### Query Parameters

None

### Request Body

None (GET request)

## 3. Used Types

### Response Types

```typescript
// From src/types.ts

// Main response type
ExpenseDTO = {
  id: string;
  user_id: string;
  category_id: string;
  amount: string;              // Returned as string for precision
  expense_date: string;         // YYYY-MM-DD format
  currency: string;             // e.g., "PLN"
  created_by_ai: boolean;
  was_ai_suggestion_edited: boolean;
  created_at: string;           // ISO 8601 timestamp
  updated_at: string;           // ISO 8601 timestamp
  category: CategoryDTO;
}

// Nested category type
CategoryDTO = {
  id: string;
  name: string;
}

// Error response type
APIErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }
}
```

### Validation Schema

```typescript
// To be added in src/lib/validation/expense.validation.ts

export const ExpenseIdSchema = z.object({
  id: z.string().uuid({
    message: "Invalid expense ID format. Must be a valid UUID.",
  }),
});
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "category_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "category": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Groceries"
  },
  "amount": "45.50",
  "expense_date": "2024-01-15",
  "currency": "PLN",
  "created_by_ai": false,
  "was_ai_suggestion_edited": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Error Responses

#### 400 Bad Request - Invalid UUID Format

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid expense ID format. Must be a valid UUID.",
    "details": {
      "field": "id",
      "provided": "invalid-id"
    }
  }
}
```

#### 401 Unauthorized - Missing or Invalid Token

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required. Please provide a valid access token."
  }
}
```

#### 404 Not Found - Expense Not Found or Unauthorized

```json
{
  "error": {
    "code": "EXPENSE_NOT_FOUND",
    "message": "Expense not found or you don't have permission to access it."
  }
}
```

**Note:** The same 404 response is returned for both non-existent expenses and expenses belonging to other users. This prevents attackers from enumerating valid expense IDs.

#### 500 Internal Server Error - Database or Server Error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again later.",
    "details": {
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
}
```

## 5. Data Flow

### Request Flow

1. **Client Request** → Sends GET request to `/api/expenses/{id}` with Authorization header
2. **Astro Middleware** → Validates JWT token and attaches Supabase client to `context.locals`
3. **Route Handler** → Extracts `id` from URL parameters
4. **Input Validation** → Validates UUID format using Zod schema
5. **Service Layer** → Calls `getExpenseById()` with authenticated user context
6. **Database Query** → Supabase queries `expenses` table with:
   - RLS policy enforcement (automatic user_id filtering)
   - Category join for nested data
   - Single record fetch by ID
7. **Response Transformation** → Converts database result to `ExpenseDTO` format
8. **Client Response** → Returns JSON response with appropriate status code

### Database Query Structure

```sql
-- Executed by Supabase client (conceptual representation)
SELECT
  e.*,
  c.id as "category.id",
  c.name as "category.name"
FROM expenses e
INNER JOIN categories c ON e.category_id = c.id
WHERE e.id = $1
  AND e.user_id = $2  -- Enforced by RLS + explicit check
LIMIT 1;
```

### Data Transformation

- `amount`: `numeric(10,2)` → `string` (e.g., `45.50` → `"45.50"`)
- `expense_date`: `date` → `string` (YYYY-MM-DD format)
- `created_at`, `updated_at`: `timestamptz` → `string` (ISO 8601 format)
- `category`: Nested object with `id` and `name` fields

## 6. Security Considerations

### Authentication

- **JWT Token Validation**: Handled by Supabase middleware in `src/middleware/index.ts`
- **Token Expiration**: Supabase automatically validates token expiration
- **Token Format**: Must be provided as `Bearer {token}` in Authorization header

### Authorization

- **Row Level Security (RLS)**: Enabled on `expenses` table with policy:
  ```sql
  -- Allow individual read access
  CREATE POLICY "Allow individual read access" ON expenses
    FOR SELECT
    USING (auth.uid() = user_id);
  ```
- **Explicit User Verification**: Service layer verifies `user_id` matches authenticated user
- **Ownership Enforcement**: Users can only access their own expenses

### Input Validation

- **UUID Format Validation**: Prevents SQL injection and invalid queries
- **Early Validation**: Validates before database query to reduce load
- **Zod Schema**: Type-safe validation with clear error messages

### Information Disclosure Prevention

- **Unified 404 Response**: Same response for non-existent and unauthorized expenses
- **No User Enumeration**: Prevents attackers from discovering valid expense IDs
- **Minimal Error Details**: Production errors don't expose internal details

### Additional Security Measures

- **HTTPS Only**: All API requests must use HTTPS in production
- **Rate Limiting**: Consider implementing rate limiting for API endpoints
- **CORS Configuration**: Properly configured CORS headers
- **SQL Injection Prevention**: Supabase client uses parameterized queries

## 7. Error Handling

### Error Scenarios and Handling Strategy

#### 1. Invalid UUID Format (400 Bad Request)

**Trigger:** Path parameter `id` is not a valid UUID
**Detection:** Zod validation fails
**Handling:**

```typescript
try {
  const { id } = ExpenseIdSchema.parse({ id: context.params.id });
} catch (error) {
  return new Response(
    JSON.stringify({
      error: {
        code: "INVALID_INPUT",
        message: "Invalid expense ID format. Must be a valid UUID.",
        details: { field: "id", provided: context.params.id },
      },
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 2. Missing or Invalid Authentication (401 Unauthorized)

**Trigger:** No Authorization header or invalid/expired token
**Detection:** Supabase middleware fails to authenticate
**Handling:** Middleware returns 401 before reaching route handler

#### 3. Expense Not Found or Unauthorized (404 Not Found)

**Trigger:**

- Expense ID doesn't exist in database
- Expense belongs to different user (RLS blocks access)
  **Detection:** Service returns `null`
  **Handling:**

```typescript
const expense = await getExpenseById(supabase, userId, id);

if (!expense) {
  return new Response(
    JSON.stringify({
      error: {
        code: "EXPENSE_NOT_FOUND",
        message: "Expense not found or you don't have permission to access it.",
      },
    }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 4. Database Connection Error (500 Internal Server Error)

**Trigger:** Database unavailable or connection timeout
**Detection:** Supabase client throws error
**Handling:**

```typescript
try {
  const expense = await getExpenseById(supabase, userId, id);
} catch (error) {
  console.error("Database error in GET /api/expenses/:id:", error);
  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again later.",
        details: { timestamp: new Date().toISOString() },
      },
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 5. Unexpected Server Error (500 Internal Server Error)

**Trigger:** Unhandled exception in route handler
**Detection:** Top-level try-catch
**Handling:**

```typescript
try {
  // ... route handler logic
} catch (error) {
  console.error("Unexpected error in GET /api/expenses/:id:", error);
  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again later.",
      },
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Error Logging Strategy

- **Console Logging**: Use `console.error()` for server-side errors
- **Error Context**: Include timestamp, user ID (if available), and error details
- **Sensitive Data**: Never log sensitive information (tokens, passwords)
- **Production vs Development**: More verbose logging in development

## 8. Performance Considerations

### Database Optimization

- **Indexed Queries**: Primary key lookup on `expenses.id` (automatically indexed)
- **Single Query**: Fetch expense and category in one query using join
- **RLS Performance**: RLS policies use indexed `user_id` column
- **Composite Index**: Existing `expenses_user_id_expense_date_idx` helps with user filtering

### Query Performance

- **Expected Query Time**: < 10ms for single record lookup by primary key
- **Network Latency**: Primary factor in total response time
- **Connection Pooling**: Supabase handles connection pooling automatically

### Caching Considerations

- **Client-Side Caching**: Consider `Cache-Control` headers for expense data
- **ETags**: Implement ETags based on `updated_at` timestamp for conditional requests
- **Stale-While-Revalidate**: Consider for non-critical expense views

### Potential Bottlenecks

1. **Network Latency**: Distance between client and Supabase server
   - Mitigation: Use CDN for static assets, consider edge functions
2. **Cold Start**: First request after idle period
   - Mitigation: Keep-alive connections, connection pooling
3. **Large Category Names**: Unlikely but possible
   - Mitigation: Database column limits prevent excessive data

### Monitoring Recommendations

- Track response times for 95th and 99th percentiles
- Monitor database query performance
- Alert on error rate spikes
- Track 404 rate (high rate may indicate enumeration attempts)

## 9. Implementation Steps

### Step 1: Add Validation Schema

**File:** `src/lib/validation/expense.validation.ts`

Add the following export to the existing file:

```typescript
/**
 * Validation schema for expense ID path parameter
 * Used in: GET /api/expenses/{id}, PATCH /api/expenses/{id}, DELETE /api/expenses/{id}
 */
export const ExpenseIdSchema = z.object({
  id: z.string().uuid({
    message: "Invalid expense ID format. Must be a valid UUID.",
  }),
});
```

### Step 2: Add Service Method

**File:** `src/lib/services/expense.service.ts`

Add the following function to the existing service:

```typescript
/**
 * Retrieves a single expense by ID for the authenticated user
 * Includes nested category information
 *
 * @param supabase - Supabase client instance (with user context from auth)
 * @param userId - ID of the authenticated user
 * @param expenseId - UUID of the expense to retrieve
 * @returns Expense with nested category, or null if not found/unauthorized
 */
export async function getExpenseById(
  supabase: SupabaseClient,
  userId: string,
  expenseId: string
): Promise<ExpenseDTO | null> {
  // Query expense with category join
  // RLS policy automatically filters by user_id
  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
      *,
      category:categories(id, name)
    `
    )
    .eq("id", expenseId)
    .eq("user_id", userId) // Explicit check for clarity
    .single();

  // Handle not found (returns null for both not found and unauthorized)
  if (error) {
    if (error.code === "PGRST116") {
      // PostgREST "not found" error code
      return null;
    }
    throw error;
  }

  // Transform to ExpenseDTO format
  return {
    id: data.id,
    user_id: data.user_id,
    category_id: data.category_id,
    amount: data.amount.toString(),
    expense_date: data.expense_date,
    currency: data.currency,
    created_by_ai: data.created_by_ai,
    was_ai_suggestion_edited: data.was_ai_suggestion_edited,
    created_at: data.created_at,
    updated_at: data.updated_at,
    category: {
      id: (data.category as any).id,
      name: (data.category as any).name,
    } as CategoryDTO,
  };
}
```

### Step 3: Create Route Handler

**File:** `src/pages/api/expenses/[id].ts`

Create a new file with the following content:

```typescript
import type { APIRoute } from "astro";
import { getExpenseById } from "../../../lib/services/expense.service";
import { ExpenseIdSchema } from "../../../lib/validation/expense.validation";

/**
 * GET /api/expenses/{id}
 * Retrieves a single expense by ID for the authenticated user
 */
export const GET: APIRoute = async (context) => {
  try {
    // Get Supabase client from middleware
    const supabase = context.locals.supabase;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required. Please provide a valid access token.",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate expense ID format
    const validationResult = ExpenseIdSchema.safeParse({
      id: context.params.id,
    });

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_INPUT",
            message: "Invalid expense ID format. Must be a valid UUID.",
            details: {
              field: "id",
              provided: context.params.id,
            },
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { id } = validationResult.data;

    // Fetch expense from database
    const expense = await getExpenseById(supabase, user.id, id);

    // Handle not found
    if (!expense) {
      return new Response(
        JSON.stringify({
          error: {
            code: "EXPENSE_NOT_FOUND",
            message: "Expense not found or you don't have permission to access it.",
          },
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return success response
    return new Response(JSON.stringify(expense), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log error for debugging
    console.error("Error in GET /api/expenses/:id:", error);

    // Return generic error response
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again later.",
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// Disable prerendering for this API route
export const prerender = false;
```

### Step 4: Update Type Imports

**File:** `src/lib/services/expense.service.ts`

Update the import statement at the top of the file to include the new function's return type:

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { BatchExpenseItem, ExpenseDTO, ExpenseListDTO, ExpenseQueryParams, CategoryDTO } from "../../types";
```

### Step 5: Test the Endpoint

#### Manual Testing Checklist

1. **Valid Request Test**
   - Create an expense via POST `/api/expenses`
   - Use the returned ID to GET `/api/expenses/{id}`
   - Verify response matches created expense

2. **Invalid UUID Test**
   - GET `/api/expenses/invalid-id`
   - Verify 400 Bad Request response

3. **Not Found Test**
   - GET `/api/expenses/00000000-0000-0000-0000-000000000000`
   - Verify 404 Not Found response

4. **Unauthorized Test**
   - Create expense as User A
   - Try to access as User B
   - Verify 404 Not Found response (not 403)

5. **Missing Auth Test**
   - GET without Authorization header
   - Verify 401 Unauthorized response

#### Automated Test Cases (Future)

```typescript
describe("GET /api/expenses/:id", () => {
  it("should return expense for authenticated user", async () => {
    // Test implementation
  });

  it("should return 400 for invalid UUID", async () => {
    // Test implementation
  });

  it("should return 404 for non-existent expense", async () => {
    // Test implementation
  });

  it("should return 404 for other user's expense", async () => {
    // Test implementation
  });

  it("should return 401 without authentication", async () => {
    // Test implementation
  });
});
```

### Step 6: Documentation Updates

1. Update API documentation with endpoint details
2. Add example requests/responses to developer docs
3. Update Postman/Insomnia collection with new endpoint
4. Document error codes in API reference

### Step 7: Monitoring Setup

1. Add endpoint to monitoring dashboard
2. Set up alerts for high error rates
3. Track response time metrics
4. Monitor 404 rate for potential security issues

## 10. Additional Notes

### Future Enhancements

- **Caching**: Implement Redis caching for frequently accessed expenses
- **ETags**: Add ETag support for conditional requests
- **Compression**: Enable gzip compression for responses
- **Rate Limiting**: Add per-user rate limiting
- **Audit Logging**: Log all access attempts for security auditing

### Related Endpoints

- `GET /api/expenses` - List all expenses (with filtering)
- `POST /api/expenses` - Create single expense
- `PATCH /api/expenses/{id}` - Update expense
- `DELETE /api/expenses/{id}` - Delete expense

### Dependencies

- Supabase client (authentication and database)
- Zod (input validation)
- Astro (routing and middleware)

### Breaking Changes

None - This is a new endpoint implementation.

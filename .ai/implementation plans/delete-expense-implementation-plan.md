# API Endpoint Implementation Plan: Delete Expense

## 1. Endpoint Overview

The Delete Expense endpoint allows authenticated users to permanently remove a specific expense from their account. This is a destructive operation that cannot be undone. The endpoint leverages Supabase Row Level Security (RLS) to ensure users can only delete their own expenses, providing built-in authorization at the database level.

**Key Characteristics:**

- Idempotent operation (multiple DELETE requests have same effect)
- No response body on success (204 No Content)
- Protected by RLS policies ensuring data isolation
- Validates expense ownership implicitly through RLS

## 2. Request Details

- **HTTP Method**: DELETE
- **URL Structure**: `/api/expenses/{id}`
- **Authentication**: Required via `Authorization: Bearer {access_token}` header

### Parameters

**Required:**

- `id` (path parameter, UUID): The unique identifier of the expense to delete
  - Must be a valid UUID v4 format
  - Example: `550e8400-e29b-41d4-a716-446655440000`

**Optional:**

- None

### Request Body

- None (DELETE requests do not include a body)

### Headers

- `Authorization: Bearer {access_token}` (required)
  - Token obtained from Supabase authentication
  - Must be valid and not expired

## 3. Used Types

### Internal Types

```typescript
// From src/types.ts
type Expense = Tables<"expenses">; // Used internally for type safety

// From src/types.ts
type APIErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

### Validation Schema

```typescript
// To be added in src/lib/validation/expense.validation.ts
import { z } from "zod";

export const deleteExpenseParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid expense ID format" }),
});
```

## 4. Response Details

### Success Response (204 No Content)

- **Status Code**: 204
- **Body**: Empty (no content)
- **Headers**: Standard HTTP headers only

### Error Responses

#### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Triggers:**

- Missing Authorization header
- Invalid token format
- Expired token
- Invalid token signature

#### 404 Not Found

```json
{
  "error": {
    "code": "EXPENSE_NOT_FOUND",
    "message": "Expense not found or access denied"
  }
}
```

**Triggers:**

- Expense ID doesn't exist in database
- Expense belongs to different user (blocked by RLS)
- Invalid UUID format

#### 500 Internal Server Error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

**Triggers:**

- Database connection failures
- Unexpected Supabase errors
- Unhandled exceptions in service layer

## 5. Data Flow

```
1. Client Request
   ↓
2. Astro API Route (/src/pages/api/expenses/[id].ts)
   ↓
3. Extract & Validate Path Parameter (id)
   ↓
4. Get Supabase Client from context.locals
   ↓
5. Get Authenticated User from Supabase
   ├─ If no user → Return 401
   └─ If user exists → Continue
   ↓
6. Call expenseService.deleteExpense(supabase, id)
   ↓
7. Service Layer (/src/lib/services/expense.service.ts)
   ├─ Execute DELETE query with RLS
   ├─ RLS Policy validates: auth.uid() = user_id
   └─ Return result
   ↓
8. API Route Processes Result
   ├─ If deleted → Return 204 No Content
   ├─ If not found → Return 404
   └─ If error → Return 500
   ↓
9. Client Receives Response
```

### Database Interaction

```sql
-- Executed by Supabase client (simplified representation)
DELETE FROM expenses
WHERE id = $1
AND user_id = auth.uid(); -- Enforced by RLS policy
```

**RLS Policy (from db-plan.md):**

- Policy Name: "Allow individual delete access"
- Action: DELETE
- Check: `auth.uid() = user_id`

## 6. Security Considerations

### Authentication

- **Mechanism**: Supabase JWT-based authentication via Bearer token
- **Validation**: Handled by Supabase client automatically
- **Token Extraction**: From `Authorization: Bearer {token}` header
- **Session Management**: Supabase manages token expiration and refresh

### Authorization

- **Primary Defense**: Row Level Security (RLS) at database level
- **Policy**: Users can only delete expenses where `user_id` matches their `auth.uid()`
- **Advantage**: Authorization logic cannot be bypassed, even with direct database access
- **Implicit Validation**: No need for explicit ownership checks in application code

### Input Validation

- **UUID Validation**: Zod schema ensures `id` parameter is valid UUID v4 format
- **SQL Injection Protection**: Supabase client uses parameterized queries
- **Type Safety**: TypeScript ensures type correctness throughout the stack

### IDOR (Insecure Direct Object Reference) Protection

- **Threat**: User attempts to delete another user's expense by guessing IDs
- **Mitigation**: RLS policy blocks access to expenses not owned by authenticated user
- **Result**: Returns 404 (not 403) to avoid information disclosure about expense existence

### Additional Security Measures

- **HTTPS Only**: All API communication should use HTTPS in production
- **CORS Configuration**: Restrict origins in production environment
- **Rate Limiting**: Consider implementing rate limiting for DELETE operations (not in current scope)

## 7. Error Handling

### Error Handling Strategy

Follow the "fail fast" principle with early returns for error conditions:

```typescript
// Pseudocode structure
export async function DELETE(context) {
  // 1. Validate path parameter
  const validation = validateParams(context.params);
  if (!validation.success) {
    return new Response(JSON.stringify(errorResponse), { status: 404 });
  }

  // 2. Check authentication
  const user = await getUser(supabase);
  if (!user) {
    return new Response(JSON.stringify(errorResponse), { status: 401 });
  }

  // 3. Attempt deletion
  const result = await deleteExpense(supabase, id);
  if (!result.success) {
    return new Response(JSON.stringify(errorResponse), { status: 404 });
  }

  // 4. Happy path - return success
  return new Response(null, { status: 204 });
}
```

### Error Scenarios and Handling

| Scenario                      | Detection                              | Status Code | Response            |
| ----------------------------- | -------------------------------------- | ----------- | ------------------- |
| Invalid UUID format           | Zod validation fails                   | 404         | `EXPENSE_NOT_FOUND` |
| Missing auth token            | `supabase.auth.getUser()` returns null | 401         | `UNAUTHORIZED`      |
| Expired token                 | Supabase auth validation fails         | 401         | `UNAUTHORIZED`      |
| Expense doesn't exist         | Delete returns 0 affected rows         | 404         | `EXPENSE_NOT_FOUND` |
| Expense belongs to other user | RLS blocks query, 0 affected rows      | 404         | `EXPENSE_NOT_FOUND` |
| Database connection error     | Supabase client throws error           | 500         | `INTERNAL_ERROR`    |
| Unexpected exception          | Try-catch in service layer             | 500         | `INTERNAL_ERROR`    |

### Error Response Format

All errors follow the standardized `APIErrorResponse` type:

```typescript
{
  error: {
    code: string;        // Machine-readable error code
    message: string;     // Human-readable error message
    details?: object;    // Optional additional context
  }
}
```

### Logging Strategy

- **Development**: Log all errors to console with full stack traces
- **Production**: Log errors with sanitized messages (no sensitive data)
- **Error Context**: Include request ID, user ID (if available), and timestamp
- **No Separate Error Table**: Based on db-plan.md, no error logging table exists

## 8. Performance Considerations

### Database Performance

- **Index Usage**: Primary key index on `expenses.id` ensures fast lookups
- **RLS Overhead**: Minimal - RLS check is part of the WHERE clause
- **Query Complexity**: Simple DELETE with single WHERE condition - O(1) operation

### Optimization Strategies

- **Connection Pooling**: Handled automatically by Supabase
- **No N+1 Queries**: Single DELETE operation, no additional queries needed
- **Minimal Data Transfer**: No response body reduces bandwidth

### Expected Performance

- **Response Time**: < 100ms for typical delete operation
- **Database Load**: Minimal - single row deletion
- **Scalability**: Excellent - stateless operation with database-level authorization

### Potential Bottlenecks

- **Authentication Overhead**: JWT validation adds ~10-20ms
- **Network Latency**: Client-to-server and server-to-database round trips
- **Database Locks**: Brief row-level lock during deletion (microseconds)

### Monitoring Recommendations

- Track average response times
- Monitor 404 vs 204 ratio (high 404 rate may indicate issues)
- Alert on 500 errors
- Track authentication failures (401 responses)

## 9. Implementation Steps

### Step 1: Add Validation Schema

**File**: `src/lib/validation/expense.validation.ts`

```typescript
// Add to existing file
export const deleteExpenseParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid expense ID format" }),
});
```

**Rationale**: Centralize validation logic for reusability and maintainability.

### Step 2: Add Service Function

**File**: `src/lib/services/expense.service.ts`

```typescript
/**
 * Deletes an expense by ID
 * RLS ensures user can only delete their own expenses
 *
 * @param supabase - Supabase client instance
 * @param expenseId - UUID of expense to delete
 * @returns Object with success status
 */
export async function deleteExpense(
  supabase: SupabaseClient<Database>,
  expenseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error, count } = await supabase.from("expenses").delete({ count: "exact" }).eq("id", expenseId);

    if (error) {
      console.error("Error deleting expense:", error);
      return { success: false, error: error.message };
    }

    // If count is 0, expense wasn't found or user doesn't have access
    if (count === 0) {
      return { success: false, error: "Expense not found" };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in deleteExpense:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
```

**Key Points:**

- Uses `count: 'exact'` to determine if deletion occurred
- RLS automatically filters by user_id
- Returns structured result for easy handling in API route
- Comprehensive error handling with logging

### Step 3: Implement DELETE Handler

**File**: `src/pages/api/expenses/[id].ts`

Add DELETE handler to existing file (which already has GET and PATCH):

```typescript
import { deleteExpenseParamsSchema } from "../../../lib/validation/expense.validation";
import { deleteExpense } from "../../../lib/services/expense.service";

export const DELETE: APIRoute = async (context) => {
  // Disable prerendering for API route
  export const prerender = false;

  const supabase = context.locals.supabase;

  // 1. Validate path parameter
  const paramsValidation = deleteExpenseParamsSchema.safeParse(context.params);

  if (!paramsValidation.success) {
    return new Response(
      JSON.stringify({
        error: {
          code: "EXPENSE_NOT_FOUND",
          message: "Expense not found or access denied",
          details: paramsValidation.error.flatten(),
        },
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { id } = paramsValidation.data;

  // 2. Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3. Delete expense (RLS ensures ownership)
  const result = await deleteExpense(supabase, id);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: {
          code: "EXPENSE_NOT_FOUND",
          message: "Expense not found or access denied",
        },
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 4. Return success with no content
  return new Response(null, { status: 204 });
};
```

**Implementation Notes:**

- Early returns for all error conditions
- Consistent error response format
- No sensitive information in error messages
- 204 status with null body on success
- Proper Content-Type headers for error responses

### Step 4: Testing Checklist

**Manual Testing:**

1. ✅ Delete own expense → 204 No Content
2. ✅ Delete non-existent expense → 404 Not Found
3. ✅ Delete another user's expense → 404 Not Found
4. ✅ Delete with invalid UUID → 404 Not Found
5. ✅ Delete without auth token → 401 Unauthorized
6. ✅ Delete with expired token → 401 Unauthorized
7. ✅ Verify expense is actually removed from database
8. ✅ Verify idempotency (second DELETE returns 404)

**Integration Testing:**

1. Test with Postman/Thunder Client
2. Verify RLS policies are active
3. Test with different user accounts
4. Verify no data leakage in error messages

**Security Testing:**

1. Attempt IDOR attack (delete other user's expense)
2. Test with malformed UUIDs
3. Test with SQL injection attempts in ID
4. Verify HTTPS enforcement in production

### Step 5: Documentation Updates

**Update API Documentation:**

- Add DELETE endpoint to API documentation
- Include example requests and responses
- Document error codes and their meanings
- Add security considerations

**Update Frontend Integration:**

- Provide example fetch/axios calls
- Document expected response handling
- Include error handling examples

---

## Summary

This implementation plan provides a complete guide for implementing the DELETE `/api/expenses/{id}` endpoint. The design leverages Supabase RLS for authorization, follows RESTful conventions with proper status codes, and implements comprehensive error handling. The endpoint is secure, performant, and maintainable, following all project coding standards and best practices.

**Key Strengths:**

- Database-level authorization via RLS
- Proper HTTP semantics (204 for successful deletion)
- Comprehensive error handling with early returns
- Type-safe implementation with TypeScript and Zod
- Clear separation of concerns (validation, service, API route)
- Security-first approach with no information leakage

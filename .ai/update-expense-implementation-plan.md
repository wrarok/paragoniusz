# API Endpoint Implementation Plan: Update Expense

## 1. Endpoint Overview

The Update Expense endpoint allows authenticated users to modify specific fields of an existing expense through a partial update (PATCH). This endpoint supports flexible updates where users can modify one or more fields without needing to provide all expense data. The endpoint leverages Supabase Row Level Security (RLS) to ensure users can only update their own expenses.

**Key Characteristics:**
- Partial update support (all fields optional)
- At least one field must be provided
- Immutable fields: `created_by_ai`, `was_ai_suggestion_edited`
- Returns full expense with nested category information
- RLS ensures ownership validation
- Automatic `updated_at` timestamp management

## 2. Request Details

- **HTTP Method**: PATCH
- **URL Structure**: `/api/expenses/{id}`
- **Authentication**: Required via `Authorization: Bearer {access_token}` (Note: Auth not yet implemented)

### Parameters

**Required:**
- `id` (path parameter, UUID): The unique identifier of the expense to update
  - Must be a valid UUID v4 format
  - Must reference an existing expense
  - Expense must belong to authenticated user (enforced by RLS)
  - Example: `550e8400-e29b-41d4-a716-446655440000`

**Optional (at least one required):**
- `category_id` (UUID): New category for the expense
- `amount` (number/string): New amount value
- `expense_date` (string): New expense date in YYYY-MM-DD format
- `currency` (string): Currency code (MVP: PLN only)

### Request Body

```json
{
  "category_id": "uuid",
  "amount": "50.00",
  "expense_date": "2024-01-16",
  "currency": "PLN"
}
```

**Validation Rules:**
- At least one field must be provided
- All fields are optional individually
- `created_by_ai` and `was_ai_suggestion_edited` cannot be modified

### Headers
- `Content-Type: application/json` (required)
- `Authorization: Bearer {access_token}` (required, not yet implemented)

## 3. Used Types

### Existing Types (from src/types.ts)

```typescript
// Request payload type (line 125)
type UpdateExpenseCommand = Pick<
  TablesUpdate<'expenses'>,
  'category_id' | 'amount' | 'expense_date' | 'currency'
>;

// Response type (line 66)
type ExpenseDTO = Omit<Expense, 'category_id' | 'amount'> & {
  category_id: string;
  amount: string;
  category: CategoryDTO;
};

// Error response type (line 248)
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
// To be added in src/lib/validation/expense.validation.ts
import { z } from 'zod';

export const UpdateExpenseSchema = z.object({
  category_id: z.string().uuid({
    message: 'Category ID must be a valid UUID'
  }).optional(),
  
  amount: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseFloat(val) : val)
    .pipe(
      z.number()
        .positive({ message: 'Amount must be greater than 0' })
        .max(99999999.99, { message: 'Amount cannot exceed 99,999,999.99' })
        .refine(
          (val) => {
            const decimalPlaces = (val.toString().split('.')[1] || '').length;
            return decimalPlaces <= 2;
          },
          { message: 'Amount must have maximum 2 decimal places' }
        )
    ).optional(),
    
  expense_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
    .refine(
      (date) => !isNaN(Date.parse(date)),
      { message: 'Invalid date' }
    )
    .refine(
      (date) => new Date(date) <= new Date(),
      { message: 'Expense date cannot be in the future' }
    ).optional(),
    
  currency: z.string()
    .length(3, { message: 'Currency must be a 3-letter code' })
    .toUpperCase()
    .refine(
      (curr) => curr === 'PLN',
      { message: 'Only PLN currency is supported in MVP' }
    ).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "category_id": "uuid",
  "category": {
    "id": "uuid",
    "name": "Transport"
  },
  "amount": "50.00",
  "expense_date": "2024-01-16",
  "currency": "PLN",
  "created_by_ai": false,
  "was_ai_suggestion_edited": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T14:20:00Z"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid expense ID format. Must be a valid UUID.",
    "details": {
      "field": "id",
      "provided": "invalid-uuid"
    }
  }
}
```

**Triggers:**
- Invalid UUID format for expense ID
- No fields provided in request body
- Invalid field values (negative amount, future date, etc.)

#### 404 Not Found
```json
{
  "error": {
    "code": "EXPENSE_NOT_FOUND",
    "message": "Expense not found."
  }
}
```

**Triggers:**
- Expense ID doesn't exist in database
- Expense belongs to different user (blocked by RLS)

#### 422 Unprocessable Entity
```json
{
  "error": {
    "code": "INVALID_CATEGORY",
    "message": "The specified category does not exist.",
    "details": {
      "category_id": "provided-uuid"
    }
  }
}
```

**Triggers:**
- Provided category_id doesn't exist in categories table

#### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again later.",
    "details": {
      "timestamp": "2024-01-16T14:20:00Z"
    }
  }
}
```

**Triggers:**
- Database connection failures
- Unexpected Supabase errors
- Unhandled exceptions in service layer

## 5. Data Flow

```
1. Client Request (PATCH /api/expenses/{id})
   ↓
2. Astro API Route (/src/pages/api/expenses/[id].ts)
   ↓
3. Validate Path Parameter (id)
   ├─ Invalid UUID → Return 400
   └─ Valid UUID → Continue
   ↓
4. Parse & Validate Request Body
   ├─ No fields provided → Return 400
   ├─ Invalid field values → Return 400
   └─ Valid data → Continue
   ↓
5. Get Supabase Client from context.locals
   ↓
6. Validate Category (if category_id provided)
   ├─ Category doesn't exist → Return 422
   └─ Category exists → Continue
   ↓
7. Call expenseService.updateExpense(supabase, id, updateData)
   ↓
8. Service Layer (/src/lib/services/expense.service.ts)
   ├─ Execute UPDATE query with RLS
   ├─ RLS Policy validates: auth.uid() = user_id
   ├─ Fetch updated expense with category join
   └─ Return result
   ↓
9. API Route Processes Result
   ├─ If updated → Transform to ExpenseDTO → Return 200
   ├─ If not found → Return 404
   └─ If error → Return 500
   ↓
10. Client Receives Response
```

### Database Interaction

```sql
-- Executed by Supabase client (simplified representation)
UPDATE expenses 
SET 
  category_id = COALESCE($1, category_id),
  amount = COALESCE($2, amount),
  expense_date = COALESCE($3, expense_date),
  currency = COALESCE($4, currency),
  updated_at = NOW()
WHERE id = $5 
AND user_id = auth.uid(); -- Enforced by RLS policy

-- Then fetch with category join
SELECT e.*, c.id as category_id, c.name as category_name
FROM expenses e
JOIN categories c ON e.category_id = c.id
WHERE e.id = $5;
```

**RLS Policy (from db-plan.md):**
- Policy Name: "Allow individual update access"
- Action: UPDATE
- Check: `auth.uid() = user_id`

## 6. Security Considerations

### Authentication
- **Mechanism**: Supabase JWT-based authentication via Bearer token
- **Validation**: Handled by Supabase client automatically (to be implemented)
- **Token Extraction**: From `Authorization: Bearer {token}` header
- **Session Management**: Supabase manages token expiration and refresh

### Authorization
- **Primary Defense**: Row Level Security (RLS) at database level
- **Policy**: Users can only update expenses where `user_id` matches their `auth.uid()`
- **Advantage**: Authorization logic cannot be bypassed, even with direct database access
- **Implicit Validation**: No need for explicit ownership checks in application code

### Input Validation
- **UUID Validation**: Zod schema ensures `id` parameter is valid UUID v4 format
- **Body Validation**: Comprehensive validation for all updatable fields
- **At Least One Field**: Prevents empty update requests
- **Immutable Fields**: Schema excludes `created_by_ai` and `was_ai_suggestion_edited`
- **SQL Injection Protection**: Supabase client uses parameterized queries
- **Type Safety**: TypeScript ensures type correctness throughout the stack

### IDOR (Insecure Direct Object Reference) Protection
- **Threat**: User attempts to update another user's expense by guessing IDs
- **Mitigation**: RLS policy blocks access to expenses not owned by authenticated user
- **Result**: Returns 404 (not 403) to avoid information disclosure about expense existence

### Category Validation
- **Foreign Key Constraint**: Database enforces category_id references valid category
- **Application-Level Check**: Validate category exists before update attempt
- **Error Handling**: Return 422 for non-existent categories with clear message

### Additional Security Measures
- **HTTPS Only**: All API communication should use HTTPS in production
- **CORS Configuration**: Restrict origins in production environment
- **Rate Limiting**: Consider implementing rate limiting for UPDATE operations (not in current scope)
- **Audit Trail**: `updated_at` timestamp automatically tracks when changes occur

## 7. Error Handling

### Error Handling Strategy

Follow the "fail fast" principle with early returns for error conditions:

```typescript
// Pseudocode structure
export async function PATCH(context) {
  // 1. Validate path parameter
  const paramsValidation = validateParams(context.params);
  if (!paramsValidation.success) {
    return new Response(JSON.stringify(errorResponse), { status: 400 });
  }

  // 2. Parse and validate request body
  const bodyValidation = validateBody(await context.request.json());
  if (!bodyValidation.success) {
    return new Response(JSON.stringify(errorResponse), { status: 400 });
  }

  // 3. Validate category if provided
  if (bodyValidation.data.category_id) {
    const categoryExists = await checkCategory(supabase, bodyValidation.data.category_id);
    if (!categoryExists) {
      return new Response(JSON.stringify(errorResponse), { status: 422 });
    }
  }

  // 4. Attempt update
  const result = await updateExpense(supabase, id, bodyValidation.data);
  if (!result.success) {
    return new Response(JSON.stringify(errorResponse), { status: 404 });
  }

  // 5. Happy path - return updated expense
  return new Response(JSON.stringify(result.data), { status: 200 });
}
```

### Error Scenarios and Handling

| Scenario | Detection | Status Code | Response |
|----------|-----------|-------------|----------|
| Invalid UUID format | Zod validation fails | 400 | `INVALID_INPUT` |
| No fields provided | Zod validation fails | 400 | `INVALID_INPUT` |
| Invalid amount | Zod validation fails | 400 | `INVALID_INPUT` |
| Future date | Zod validation fails | 400 | `INVALID_INPUT` |
| Invalid currency | Zod validation fails | 400 | `INVALID_INPUT` |
| Category doesn't exist | Category validation fails | 422 | `INVALID_CATEGORY` |
| Expense doesn't exist | Update returns 0 affected rows | 404 | `EXPENSE_NOT_FOUND` |
| Expense belongs to other user | RLS blocks query, 0 affected rows | 404 | `EXPENSE_NOT_FOUND` |
| Database connection error | Supabase client throws error | 500 | `INTERNAL_ERROR` |
| Unexpected exception | Try-catch in service layer | 500 | `INTERNAL_ERROR` |

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
- **Query Complexity**: Simple UPDATE with single WHERE condition - O(1) operation
- **Category Join**: Efficient due to foreign key index on `category_id`

### Optimization Strategies
- **Connection Pooling**: Handled automatically by Supabase
- **Partial Updates**: Only modified fields are updated (COALESCE pattern)
- **Single Query**: Update and fetch in efficient sequence
- **Minimal Data Transfer**: Only return necessary fields

### Expected Performance
- **Response Time**: < 150ms for typical update operation
- **Database Load**: Minimal - single row update + single row select
- **Scalability**: Excellent - stateless operation with database-level authorization

### Potential Bottlenecks
- **Authentication Overhead**: JWT validation adds ~10-20ms (when implemented)
- **Category Validation**: Additional query if category_id provided (~20ms)
- **Network Latency**: Client-to-server and server-to-database round trips
- **Database Locks**: Brief row-level lock during update (microseconds)

### Monitoring Recommendations
- Track average response times
- Monitor 404 vs 200 ratio (high 404 rate may indicate issues)
- Alert on 500 errors
- Track validation failure patterns (400/422 responses)
- Monitor category validation query performance

## 9. Implementation Steps

### Step 1: Add Validation Schema

**File**: `src/lib/validation/expense.validation.ts`

```typescript
// Add to existing file after CreateExpenseSchema

/**
 * Validation schema for updating an expense
 * Used in: PATCH /api/expenses/{id}
 * 
 * All fields are optional, but at least one must be provided
 * Reuses validation logic from CreateExpenseSchema where applicable
 */
export const UpdateExpenseSchema = z.object({
  category_id: z.string().uuid({
    message: 'Category ID must be a valid UUID'
  }).optional(),
  
  amount: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseFloat(val) : val)
    .pipe(
      z.number()
        .positive({ message: 'Amount must be greater than 0' })
        .max(99999999.99, { message: 'Amount cannot exceed 99,999,999.99' })
        .refine(
          (val) => {
            const decimalPlaces = (val.toString().split('.')[1] || '').length;
            return decimalPlaces <= 2;
          },
          { message: 'Amount must have maximum 2 decimal places' }
        )
    ).optional(),
    
  expense_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
    .refine(
      (date) => !isNaN(Date.parse(date)),
      { message: 'Invalid date' }
    )
    .refine(
      (date) => new Date(date) <= new Date(),
      { message: 'Expense date cannot be in the future' }
    ).optional(),
    
  currency: z.string()
    .length(3, { message: 'Currency must be a 3-letter code' })
    .toUpperCase()
    .refine(
      (curr) => curr === 'PLN',
      { message: 'Only PLN currency is supported in MVP' }
    ).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);
```

**Rationale**: 
- Reuses validation logic from CreateExpenseSchema for consistency
- Adds constraint requiring at least one field
- All fields optional for partial update support

### Step 2: Add Service Function

**File**: `src/lib/services/expense.service.ts`

```typescript
/**
 * Updates an expense by ID with partial data
 * RLS ensures user can only update their own expenses
 * 
 * @param supabase - Supabase client instance
 * @param expenseId - UUID of expense to update
 * @param updateData - Partial expense data to update
 * @returns Updated expense with nested category, or null if not found
 */
export async function updateExpense(
  supabase: SupabaseClient,
  expenseId: string,
  updateData: UpdateExpenseCommand
): Promise<ExpenseDTO | null> {
  try {
    // Prepare update data - only include provided fields
    const updatePayload: Record<string, any> = {};
    
    if (updateData.category_id !== undefined) {
      updatePayload.category_id = updateData.category_id;
    }
    if (updateData.amount !== undefined) {
      updatePayload.amount = updateData.amount;
    }
    if (updateData.expense_date !== undefined) {
      updatePayload.expense_date = updateData.expense_date;
    }
    if (updateData.currency !== undefined) {
      updatePayload.currency = updateData.currency;
    }

    // Perform update
    const { error, count } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', expenseId)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error updating expense:', error);
      throw error;
    }

    // If count is 0, expense wasn't found or user doesn't have access (RLS)
    if (count === 0) {
      return null;
    }

    // Fetch updated expense with category information
    const { data: updatedExpense, error: fetchError } = await supabase
      .from('expenses')
      .select(`
        *,
        category:categories(id, name)
      `)
      .eq('id', expenseId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated expense:', fetchError);
      throw fetchError;
    }

    // Transform to ExpenseDTO format
    return {
      id: updatedExpense.id,
      user_id: updatedExpense.user_id,
      category_id: updatedExpense.category_id,
      amount: updatedExpense.amount.toString(),
      expense_date: updatedExpense.expense_date,
      currency: updatedExpense.currency,
      created_by_ai: updatedExpense.created_by_ai,
      was_ai_suggestion_edited: updatedExpense.was_ai_suggestion_edited,
      created_at: updatedExpense.created_at,
      updated_at: updatedExpense.updated_at,
      category: {
        id: (updatedExpense.category as any).id,
        name: (updatedExpense.category as any).name,
      },
    };
  } catch (error) {
    console.error('Unexpected error in updateExpense:', error);
    throw error;
  }
}
```

**Key Points:**
- Only updates fields that are provided (partial update)
- Uses `count: 'exact'` to determine if update occurred
- RLS automatically filters by user_id
- Fetches updated expense with category join
- Returns null if expense not found or no access
- Comprehensive error handling with logging

### Step 3: Implement PATCH Handler

**File**: `src/pages/api/expenses/[id].ts`

Add PATCH handler to existing file (which already has GET and DELETE):

```typescript
import { UpdateExpenseSchema } from '../../../lib/validation/expense.validation';
import { updateExpense } from '../../../lib/services/expense.service';
import { validateCategories } from '../../../lib/services/expense.service';

/**
 * PATCH /api/expenses/{id}
 * Updates an existing expense with partial data
 * Note: Authentication will be implemented later
 */
export const PATCH: APIRoute = async (context) => {
  try {
    // Get Supabase client from middleware
    const supabase = context.locals.supabase;

    // 1. Validate path parameter (expense ID format)
    const paramsValidation = ExpenseIdSchema.safeParse({
      id: context.params.id,
    });

    if (!paramsValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid expense ID format. Must be a valid UUID.',
            details: {
              field: 'id',
              provided: context.params.id,
            },
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { id } = paramsValidation.data;

    // 2. Parse and validate request body
    let requestBody;
    try {
      requestBody = await context.request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid JSON in request body.',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const bodyValidation = UpdateExpenseSchema.safeParse(requestBody);

    if (!bodyValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid request payload.',
            details: bodyValidation.error.flatten(),
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const updateData = bodyValidation.data;

    // 3. Validate category exists if category_id is provided
    if (updateData.category_id) {
      const categoryValidation = await validateCategories(supabase, [updateData.category_id]);
      
      if (!categoryValidation.valid) {
        return new Response(
          JSON.stringify({
            error: {
              code: 'INVALID_CATEGORY',
              message: 'The specified category does not exist.',
              details: {
                category_id: updateData.category_id,
              },
            },
          }),
          {
            status: 422,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 4. Update expense (RLS ensures ownership)
    const updatedExpense = await updateExpense(supabase, id, updateData);

    // Handle not found
    if (!updatedExpense) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'EXPENSE_NOT_FOUND',
            message: 'Expense not found.',
          },
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Return updated expense
    return new Response(JSON.stringify(updatedExpense), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log error for debugging
    console.error('Error in PATCH /api/expenses/:id:', error);

    // Return generic error response
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
```

**Implementation Notes:**
- Early returns for all error conditions
- Validates path parameter, request body, and category existence
- Consistent error response format
- No sensitive information in error messages
- 200 status with full expense on success
- Proper Content-Type headers for all responses
- Reuses existing `validateCategories` helper

### Step 4: Testing Checklist

**Manual Testing:**
1. ✅ Update single field → 200 OK with updated expense
2. ✅ Update multiple fields → 200 OK with updated expense
3. ✅ Update with invalid UUID → 400 Bad Request
4. ✅ Update with no fields → 400 Bad Request
5. ✅ Update non-existent expense → 404 Not Found
6. ✅ Update with invalid category_id → 422 Unprocessable Entity
7. ✅ Update with negative amount → 400 Bad Request
8. ✅ Update with future date → 400 Bad Request
9. ✅ Update with invalid currency → 400 Bad Request
10. ✅ Verify `updated_at` timestamp changes
11. ✅ Verify `created_at` timestamp doesn't change
12. ✅ Verify immutable fields cannot be modified

**Integration Testing:**
1. Test with Postman/Thunder Client
2. Verify RLS policies are active
3. Test partial updates (one field at a time)
4. Test full updates (all fields)
5. Verify category validation works correctly
6. Confirm no data leakage in error messages

**Security Testing:**
1. Attempt to update another user's expense (IDOR)
2. Test with malformed UUIDs
3. Attempt to modify immutable fields
4. Test with SQL injection attempts in fields
5. Verify HTTPS enforcement in production

### Step 5: Documentation Updates

**Update API Documentation:**
- Mark PATCH endpoint as implemented in API plan
- Include example requests and responses
- Document all error codes and their meanings
- Add security considerations
- Include validation rules

**Update Frontend Integration:**
- Provide example fetch/axios calls
- Document expected response handling
- Include error handling examples
- Show partial update patterns

---

## Summary

This implementation plan provides a complete guide for implementing the PATCH `/api/expenses/{id}` endpoint. The design leverages Supabase RLS for authorization, supports flexible partial updates, and implements comprehensive validation and error handling. The endpoint is secure, performant, and maintainable, following all project coding standards and best practices.

**Key Strengths:**
- Partial update support with "at least one field" validation
- Database-level authorization via RLS
- Proper HTTP semantics (200 for successful update)
- Comprehensive error handling with early returns
- Type-safe implementation with TypeScript and Zod
- Clear separation of concerns (validation, service, API route)
- Security-first approach with no information leakage
- Immutable field protection at schema level
- Category existence validation before update
- Automatic timestamp management
# API Endpoint Implementation Plan: Create Multiple Expenses (Batch)

## 1. Endpoint Overview

This endpoint enables the creation of multiple expense records in a single atomic operation. It is primarily designed to be used after AI receipt processing, where multiple line items from a receipt need to be saved as separate expense records. The endpoint ensures data integrity through atomic transactions - if any single expense in the batch fails validation or creation, the entire batch is rolled back.

**Key Characteristics:**
- Atomic batch operation (all-or-nothing)
- Supports 1-50 expenses per request
- Tracks AI-generated expenses and user modifications
- Returns created expenses with nested category information
- Protected by authentication and Row Level Security (RLS)

## 2. Request Details

### HTTP Method and URL
- **Method**: `POST`
- **URL**: `/api/expenses/batch`
- **Content-Type**: `application/json`

### Authentication
- **Required**: Yes
- **Type**: Bearer token
- **Header**: `Authorization: Bearer {access_token}`
- **Source**: Supabase authentication via middleware (`context.locals.supabase`)

### Request Body Structure

```typescript
{
  "expenses": [
    {
      "category_id": "uuid",           // Required
      "amount": "35.50",               // Required (numeric string)
      "expense_date": "2024-01-15",    // Required (YYYY-MM-DD)
      "currency": "PLN",               // Optional (defaults to "PLN")
      "created_by_ai": true,           // Optional (defaults to false)
      "was_ai_suggestion_edited": false // Optional (defaults to false)
    }
  ]
}
```

### Parameters

**Array Level:**
- `expenses` (required): Array of expense objects
  - Must contain at least 1 expense
  - Must not exceed 50 expenses
  - Type: `BatchExpenseItem[]`

**Per Expense Object:**
- `category_id` (required): UUID of the expense category
  - Must be a valid UUID format
  - Must reference an existing category in the database
  - Type: `string`

- `amount` (required): Monetary value of the expense
  - Must be a positive numeric string
  - Maximum 2 decimal places
  - Format: "123.45"
  - Type: `string`

- `expense_date` (required): Date when the expense was incurred
  - Must be in YYYY-MM-DD format
  - Must be a valid date
  - Type: `string`

- `currency` (optional): Currency code for the expense
  - Defaults to "PLN" if not provided
  - Type: `string`

- `created_by_ai` (optional): Flag indicating if expense was created by AI
  - Defaults to `false` if not provided
  - Used for tracking AI feature adoption
  - Type: `boolean`

- `was_ai_suggestion_edited` (optional): Flag indicating if AI suggestion was modified
  - Defaults to `false` if not provided
  - Only meaningful when `created_by_ai` is `true`
  - Used for measuring AI accuracy
  - Type: `boolean`

## 3. Used Types

All required types are already defined in `src/types.ts`:

```typescript
// Request payload type
type CreateExpenseBatchCommand = {
  expenses: BatchExpenseItem[];
};

// Individual expense in batch
type BatchExpenseItem = Pick<
  TablesInsert<'expenses'>,
  'category_id' | 'amount' | 'expense_date' | 'currency' | 'created_by_ai' | 'was_ai_suggestion_edited'
>;

// Response type
type BatchExpenseResponseDTO = {
  data: ExpenseDTO[];
  count: number;
};

// Individual expense in response (with nested category)
type ExpenseDTO = Omit<Expense, 'category_id'> & {
  category_id: string;
  category: CategoryDTO;
};

// Nested category information
type CategoryDTO = Pick<Category, 'id' | 'name'>;

// Error response type
type APIErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

## 4. Response Details

### Success Response (201 Created)

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "category_id": "uuid",
      "category": {
        "id": "uuid",
        "name": "Groceries"
      },
      "amount": "35.50",
      "expense_date": "2024-01-15",
      "currency": "PLN",
      "created_by_ai": true,
      "was_ai_suggestion_edited": false,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 2
}
```

**Response Fields:**
- `data`: Array of created expense objects with nested category information
- `count`: Number of expenses successfully created

### Error Responses

#### 400 Bad Request - Empty Array
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Expenses array cannot be empty"
  }
}
```

#### 400 Bad Request - Exceeds Maximum
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Maximum 50 expenses per batch"
  }
}
```

#### 400 Bad Request - Validation Errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid expense data",
    "details": {
      "expenses": [
        {
          "index": 0,
          "field": "amount",
          "message": "Amount must be a positive number"
        },
        {
          "index": 2,
          "field": "category_id",
          "message": "Invalid UUID format"
        }
      ]
    }
  }
}
```

#### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### 422 Unprocessable Entity - Invalid Categories
```json
{
  "error": {
    "code": "INVALID_CATEGORY",
    "message": "One or more categories don't exist",
    "details": {
      "invalid_category_ids": ["uuid1", "uuid2"]
    }
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 5. Data Flow

### Step-by-Step Process

1. **Request Reception**
   - Astro API endpoint receives POST request at `/api/expenses/batch`
   - Middleware injects Supabase client into `context.locals.supabase`

2. **Authentication Check**
   - Extract user from Supabase session via `context.locals.supabase.auth.getUser()`
   - If no valid session, return 401 Unauthorized
   - Extract `user_id` from authenticated user

3. **Request Validation**
   - Parse request body as JSON
   - Validate against Zod schema:
     - Check `expenses` is an array
     - Check array length (1-50)
     - Validate each expense object structure
     - Validate data types and formats
   - If validation fails, return 400 with detailed error information

4. **Business Logic Validation**
   - Extract all unique `category_id` values from expenses array
   - Query database to verify all categories exist
   - If any category doesn't exist, return 422 with list of invalid IDs

5. **Data Preparation**
   - Transform each expense by adding:
     - `user_id` from authenticated user
     - Default values for optional fields if not provided
   - Prepare batch insert payload

6. **Database Transaction**
   - Use Supabase client to insert all expenses in a single transaction
   - RLS policies automatically enforce user ownership
   - If any insert fails, entire transaction rolls back

7. **Fetch Created Records**
   - Query database for newly created expenses
   - Include category information via join
   - Order by creation timestamp

8. **Response Formation**
   - Transform database records to `ExpenseDTO` format
   - Include nested category information
   - Return 201 with `BatchExpenseResponseDTO`

### Database Interactions

**Tables Involved:**
- `expenses` (primary table for inserts)
- `categories` (for validation and response data)

**Queries:**
1. Category validation:
   ```sql
   SELECT id FROM categories WHERE id IN (category_ids)
   ```

2. Batch insert:
   ```sql
   INSERT INTO expenses (user_id, category_id, amount, expense_date, currency, created_by_ai, was_ai_suggestion_edited)
   VALUES (...), (...), (...)
   RETURNING *
   ```

3. Fetch with categories:
   ```sql
   SELECT e.*, c.id as category_id, c.name as category_name
   FROM expenses e
   JOIN categories c ON e.category_id = c.id
   WHERE e.id IN (created_ids)
   ORDER BY e.created_at DESC
   ```

### Service Layer

Create `src/lib/services/expense.service.ts` with the following functions:

```typescript
// Validate that all category IDs exist
async function validateCategories(
  supabase: SupabaseClient,
  categoryIds: string[]
): Promise<{ valid: boolean; invalidIds: string[] }>

// Create multiple expenses in a transaction
async function createExpensesBatch(
  supabase: SupabaseClient,
  userId: string,
  expenses: BatchExpenseItem[]
): Promise<ExpenseDTO[]>

// Fetch expenses with category information
async function fetchExpensesWithCategories(
  supabase: SupabaseClient,
  expenseIds: string[]
): Promise<ExpenseDTO[]>
```

## 6. Security Considerations

### Authentication & Authorization

1. **Token Validation**
   - Verify Bearer token via Supabase authentication
   - Reject requests without valid session
   - Use `context.locals.supabase.auth.getUser()` to get authenticated user

2. **User ID Injection**
   - **Critical**: Never trust `user_id` from request body
   - Always use `user_id` from authenticated session
   - This prevents users from creating expenses for other users

3. **Row Level Security (RLS)**
   - Database policies enforce `auth.uid() = user_id` for INSERT
   - Provides defense-in-depth even if application logic fails
   - Automatically applied by Supabase

### Input Validation

1. **Batch Size Limits**
   - Enforce minimum 1 expense
   - Enforce maximum 50 expenses
   - Prevents DoS attacks via oversized requests

2. **Data Type Validation**
   - Use Zod schemas for strict type checking
   - Validate UUID formats for `category_id`
   - Validate numeric strings for `amount`
   - Validate date formats for `expense_date`
   - Validate boolean types for AI flags

3. **SQL Injection Prevention**
   - Use Supabase parameterized queries (built-in protection)
   - Never concatenate user input into SQL strings
   - Rely on Supabase client's query builder

### Category Validation

1. **Existence Check**
   - Verify all category IDs exist before insertion
   - Prevents foreign key constraint violations
   - Returns user-friendly error message

2. **Information Disclosure**
   - Don't reveal which specific categories are invalid
   - Use generic error message: "One or more categories don't exist"
   - Prevents category enumeration attacks

### Rate Limiting Considerations

While not implemented in this endpoint, consider:
- Limiting number of batch requests per user per time period
- Monitoring for unusual batch creation patterns
- Implementing exponential backoff for repeated failures

## 7. Error Handling

### Validation Errors (400)

**Scenario 1: Empty Array**
- **Trigger**: `expenses` array is empty
- **Response**: 400 with message "Expenses array cannot be empty"
- **Handling**: Check array length before processing

**Scenario 2: Exceeds Maximum**
- **Trigger**: `expenses` array has more than 50 items
- **Response**: 400 with message "Maximum 50 expenses per batch"
- **Handling**: Check array length before processing

**Scenario 3: Invalid Data Types**
- **Trigger**: Zod validation fails on any field
- **Response**: 400 with detailed validation errors
- **Handling**: Return structured error with field-level details
- **Example**: Invalid UUID format, non-numeric amount, invalid date

**Scenario 4: Invalid Boolean Values**
- **Trigger**: `created_by_ai` or `was_ai_suggestion_edited` is not boolean
- **Response**: 400 with specific field error
- **Handling**: Zod schema validation

### Authentication Errors (401)

**Scenario: Missing or Invalid Token**
- **Trigger**: No Bearer token or invalid/expired token
- **Response**: 401 with message "Authentication required"
- **Handling**: Check `context.locals.supabase.auth.getUser()` result
- **Early Return**: Before any data processing

### Business Logic Errors (422)

**Scenario: Invalid Categories**
- **Trigger**: One or more `category_id` values don't exist in database
- **Response**: 422 with list of invalid category IDs
- **Handling**: 
  - Query database for all unique category IDs
  - Compare with provided IDs
  - Return difference as invalid IDs
- **Atomicity**: Reject entire batch, don't create any expenses

### Database Errors (500)

**Scenario 1: Connection Failure**
- **Trigger**: Cannot connect to Supabase
- **Response**: 500 with generic error message
- **Handling**: Log error details server-side, return generic message to client

**Scenario 2: Transaction Failure**
- **Trigger**: Database transaction fails mid-operation
- **Response**: 500 with generic error message
- **Handling**: Transaction automatically rolls back, log error

**Scenario 3: RLS Policy Violation**
- **Trigger**: RLS policy prevents insert (shouldn't happen with correct implementation)
- **Response**: 500 with generic error message
- **Handling**: Log error for investigation, indicates application bug

### Error Response Structure

All errors follow consistent structure:
```typescript
{
  error: {
    code: string,        // Machine-readable error code
    message: string,     // Human-readable error message
    details?: object     // Optional additional context
  }
}
```

### Error Logging Strategy

1. **Client Errors (4xx)**
   - Log minimal information (error type, timestamp)
   - Don't log sensitive data
   - Useful for identifying validation issues

2. **Server Errors (5xx)**
   - Log full error details including stack trace
   - Log request context (user ID, timestamp)
   - Alert on repeated failures
   - Don't expose internal details to client

## 8. Performance Considerations

### Potential Bottlenecks

1. **Category Validation Query**
   - Must query database before insert
   - Could be slow with many unique categories
   - **Mitigation**: Use `IN` clause for single query, not N queries

2. **Batch Insert Size**
   - 50 expenses is reasonable but could be slow
   - **Mitigation**: Use single INSERT with multiple VALUES

3. **Fetching Created Records**
   - Need to query back with JOIN for category info
   - **Mitigation**: Use efficient JOIN, leverage indexes

4. **Network Latency**
   - Multiple round trips to Supabase
   - **Mitigation**: Minimize queries, use batch operations

### Optimization Strategies

1. **Database Indexes**
   - Ensure index exists on `categories.id` (primary key)
   - Ensure index exists on `expenses.user_id` (for RLS)
   - Composite index on `(user_id, expense_date DESC)` already exists

2. **Query Optimization**
   - Use single query for category validation
   - Use single INSERT for all expenses
   - Use single SELECT with JOIN for response

3. **Caching Considerations**
   - Categories rarely change - could cache in memory
   - Not implemented in MVP but consider for future

4. **Response Size**
   - Returning all created expenses could be large
   - Consider pagination for very large batches
   - Current 50-item limit keeps response manageable

### Expected Performance

- **Category Validation**: ~50-100ms
- **Batch Insert**: ~100-200ms for 50 items
- **Fetch with Categories**: ~50-100ms
- **Total Response Time**: ~200-400ms for full batch

## 9. Implementation Steps

### Step 1: Create Zod Validation Schema

**File**: `src/pages/api/expenses/batch.ts`

```typescript
import { z } from 'zod';

const batchExpenseItemSchema = z.object({
  category_id: z.string().uuid('Invalid category ID format'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid number with up to 2 decimal places'),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  currency: z.string().default('PLN'),
  created_by_ai: z.boolean().default(false),
  was_ai_suggestion_edited: z.boolean().default(false),
});

const createExpenseBatchSchema = z.object({
  expenses: z.array(batchExpenseItemSchema)
    .min(1, 'Expenses array cannot be empty')
    .max(50, 'Maximum 50 expenses per batch'),
});
```

### Step 2: Create Expense Service

**File**: `src/lib/services/expense.service.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';
import type { BatchExpenseItem, ExpenseDTO } from '../../types';

export async function validateCategories(
  supabase: SupabaseClient<Database>,
  categoryIds: string[]
): Promise<{ valid: boolean; invalidIds: string[] }> {
  // Query database for categories
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .in('id', categoryIds);

  if (error) {
    throw error;
  }

  const validIds = new Set(data.map(c => c.id));
  const invalidIds = categoryIds.filter(id => !validIds.has(id));

  return {
    valid: invalidIds.length === 0,
    invalidIds,
  };
}

export async function createExpensesBatch(
  supabase: SupabaseClient<Database>,
  userId: string,
  expenses: BatchExpenseItem[]
): Promise<ExpenseDTO[]> {
  // Prepare insert data with user_id
  const insertData = expenses.map(expense => ({
    user_id: userId,
    category_id: expense.category_id,
    amount: expense.amount,
    expense_date: expense.expense_date,
    currency: expense.currency || 'PLN',
    created_by_ai: expense.created_by_ai || false,
    was_ai_suggestion_edited: expense.was_ai_suggestion_edited || false,
  }));

  // Insert all expenses
  const { data, error } = await supabase
    .from('expenses')
    .insert(insertData)
    .select(`
      *,
      category:categories (
        id,
        name
      )
    `);

  if (error) {
    throw error;
  }

  // Transform to ExpenseDTO format
  return data.map(expense => ({
    ...expense,
    category: expense.category as { id: string; name: string },
  }));
}
```

### Step 3: Create API Endpoint Handler

**File**: `src/pages/api/expenses/batch.ts`

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import type { CreateExpenseBatchCommand, BatchExpenseResponseDTO, APIErrorResponse } from '../../../types';
import { validateCategories, createExpensesBatch } from '../../../lib/services/expense.service';

export const prerender = false;

// Zod schemas (from Step 1)
const batchExpenseItemSchema = z.object({
  category_id: z.string().uuid('Invalid category ID format'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid number with up to 2 decimal places'),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  currency: z.string().default('PLN'),
  created_by_ai: z.boolean().default(false),
  was_ai_suggestion_edited: z.boolean().default(false),
});

const createExpenseBatchSchema = z.object({
  expenses: z.array(batchExpenseItemSchema)
    .min(1, 'Expenses array cannot be empty')
    .max(50, 'Maximum 50 expenses per batch'),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Authentication check
    const { data: { user }, error: authError } = await locals.supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        } as APIErrorResponse),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Parse and validate request body
    let body: CreateExpenseBatchCommand;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid request body',
          },
        } as APIErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validation = createExpenseBatchSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid expense data',
            details: validation.error.format(),
          },
        } as APIErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { expenses } = validation.data;

    // Step 3: Validate categories exist
    const uniqueCategoryIds = [...new Set(expenses.map(e => e.category_id))];
    const categoryValidation = await validateCategories(locals.supabase, uniqueCategoryIds);

    if (!categoryValidation.valid) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_CATEGORY',
            message: "One or more categories don't exist",
            details: {
              invalid_category_ids: categoryValidation.invalidIds,
            },
          },
        } as APIErrorResponse),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Create expenses batch
    const createdExpenses = await createExpensesBatch(
      locals.supabase,
      user.id,
      expenses
    );

    // Step 5: Return success response
    const response: BatchExpenseResponseDTO = {
      data: createdExpenses,
      count: createdExpenses.length,
    };

    return new Response(
      JSON.stringify(response),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log error for debugging
    console.error('Error creating expense batch:', error);

    // Return generic error to client
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      } as APIErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### Step 4: Test Authentication

1. Test with missing token → expect 401
2. Test with invalid token → expect 401
3. Test with valid token → proceed to next tests

### Step 5: Test Validation

1. Test with empty array → expect 400 "Expenses array cannot be empty"
2. Test with 51 expenses → expect 400 "Maximum 50 expenses per batch"
3. Test with invalid UUID → expect 400 with validation details
4. Test with invalid amount format → expect 400 with validation details
5. Test with invalid date format → expect 400 with validation details
6. Test with invalid boolean → expect 400 with validation details

### Step 6: Test Category Validation

1. Test with non-existent category ID → expect 422
2. Test with mix of valid and invalid categories → expect 422
3. Test with all valid categories → proceed to creation

### Step 7: Test Batch Creation

1. Test creating single expense → expect 201 with 1 expense
2. Test creating multiple expenses → expect 201 with all expenses
3. Verify all expenses have correct user_id
4. Verify nested category information is included
5. Verify AI flags are set correctly
6. Verify default values are applied

### Step 8: Test Error Scenarios

1. Test database connection failure → expect 500
2. Test RLS policy violation (if possible) → expect 500
3. Verify transaction rollback on partial failure

### Step 9: Performance Testing

1. Test with 50 expenses → measure response time
2. Test with many unique categories → measure validation time

### Step 10: Documentation

1. Update API documentation with endpoint details
2. Document error codes and responses
3. Add usage examples for frontend integration
4. Document AI flag usage patterns

---

## Summary

This implementation plan provides a comprehensive guide for creating the batch expense creation endpoint. The endpoint is designed with security, performance, and data integrity as primary concerns. Key features include:

- **Atomic operations** ensuring all-or-nothing batch creation
- **Comprehensive validation** at multiple levels
- **Strong security** through authentication, RLS, and input validation
- **Clear error handling** with detailed, actionable error messages
- **Performance optimization** through efficient database queries
- **AI tracking** for measuring feature adoption and accuracy

The implementation follows all project guidelines including Astro best practices, TypeScript type safety, Zod validation, and Supabase integration patterns.
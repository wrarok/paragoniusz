
# API Endpoint Implementation Plan: Create Expense (Manual)

## 1. Endpoint Overview

This endpoint creates a single expense record manually entered by the user. It validates all input fields, ensures the category exists, and returns the complete expense details including nested category information. The endpoint enforces data integrity through validation and Row Level Security (RLS) policies.

**Key Features:**
- Creates single expense with manual entry
- Validates category existence before creation
- Validates amount format, range, and decimal places
- Validates date format and business rules (not in future)
- Only supports PLN currency in MVP
- Automatically sets created_by_ai=false and was_ai_suggestion_edited=false
- Returns 201 Created with full expense details

## 2. Request Details

### HTTP Method
`POST`

### URL Structure
`/api/expenses`

### Headers
- `Authorization: Bearer {access_token}` (required)
  - Validated by Supabase middleware
  - Must be a valid, non-expired JWT token
  - Note: Authentication not yet implemented, will be added later

### Query Parameters
None

### Request Body
```json
{
  "category_id": "uuid",
  "amount": "45.50",
  "expense_date": "2024-01-15",
  "currency": "PLN"
}
```

**Required Fields:**
- `category_id` (string, UUID format)
  - Must be valid UUID format
  - Must reference existing category in database
  
- `amount` (number or string)
  - Must be positive (> 0)
  - Maximum 2 decimal places
  - Maximum value: 99,999,999.99
  - Can be provided as string "45.50" or number 45.50
  
- `expense_date` (string, YYYY-MM-DD format)
  - Must be valid date
  - Cannot be in the future
  - Warning (not error) if more than 1 year in the past

**Optional Fields:**
- `currency` (string, 3-letter ISO code)
  - Defaults to 'PLN' if not provided
  - Only 'PLN' supported in MVP
  - Must be exactly 3 uppercase letters

## 3. Used Types

### Request Types
```typescript
// From src/types.ts (lines 86-89)
CreateExpenseCommand = {
  category_id: string;
  amount: number;
  expense_date: string;
  currency?: string;
}
```

### Response Types
```typescript
// From src/types.ts (lines 66-70)
ExpenseDTO = {
  id: string;
  user_id: string;
  category_id: string;
  amount: string;              // Returned as string for precision
  expense_date: string;         // YYYY-MM-DD format
  currency: string;
  created_by_ai: boolean;       // Always false for manual creation
  was_ai_suggestion_edited: boolean;  // Always false for manual creation
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

export const CreateExpenseSchema = z.object({
  category_id: z.string().uuid({
    message: 'Category ID must be a valid UUID'
  }),
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
    ),
  expense_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
    .refine(
      (date) => !isNaN(Date.parse(date)),
      { message: 'Invalid date' }
    )
    .refine(
      (date) => new Date(date) <= new Date(),
      { message: 'Expense date cannot be in the future' }
    ),
  currency: z.string()
    .length(3, { message: 'Currency must be a 3-letter code' })
    .toUpperCase()
    .default('PLN')
    .refine(
      (curr) => curr === 'PLN',
      { message: 'Only PLN currency is supported in MVP' }
    )
    .optional()
});
```

## 4. Response Details

### Success Response (201 Created)
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

#### 400 Bad Request - Missing Required Fields
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "category_id": "Required",
      "amount": "Required"
    }
  }
}
```

#### 400 Bad Request - Invalid UUID Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Category ID must be a valid UUID",
    "details": {
      "field": "category_id",
      "provided": "invalid-uuid"
    }
  }
}
```

#### 400 Bad Request - Invalid Amount
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount must be a positive number with max 2 decimal places",
    "details": {
      "field": "amount",
      "provided": "45.555"
    }
  }
}
```

#### 400 Bad Request - Invalid Date
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid date format or date cannot be in the future",
    "details": {
      "field": "expense_date",
      "provided": "2025-12-31"
    }
  }
}
```

#### 400 Bad Request - Unsupported Currency
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Only PLN currency is supported in MVP",
    "details": {
      "field": "currency",
      "provided": "USD"
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

#### 422 Unprocessable Entity - Category Not Found
```json
{
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "The specified category does not exist",
    "details": {
      "category_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  }
}
```

#### 500 Internal Server Error - Database Error
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
1. **Client Request** → Sends POST request to `/api/expenses` with JSON body and Authorization header
2. **Astro Middleware** → Validates JWT token and attaches Supabase client to `context.locals`
3. **Route Handler** → Parses request body
4. **Input Validation** → Validates all fields using Zod schema
5. **Category Validation** → Checks if category_id exists in database
6. **Service Layer** → Calls `createExpense()` with validated data and user_id
7. **Database Insert** → Supabase inserts expense with:
   - RLS policy enforcement (automatic user_id filtering)
   - Auto-generated id, created_at, updated_at
   - created_by_ai=false, was_ai_suggestion_edited=false
8. **Database Query** → Fetch created expense with category join
9. **Response Transformation** → Convert to ExpenseDTO format
10. **Client Response** → Returns 201 Created with expense data

### Database Operations

**Category Validation Query:**
```sql
SELECT id FROM categories WHERE id = $1;
```

**Insert Query (conceptual):**
```sql
INSERT INTO expenses (
  user_id,
  category_id,
  amount,
  expense_date,
  currency,
  created_by_ai,
  was_ai_suggestion_edited
) VALUES (
  $1,  -- user_id from auth
  $2,  -- category_id from request
  $3,  -- amount from request
  $4,  -- expense_date from request
  $5,  -- currency from request (default 'PLN')
  false,  -- created_by_ai
  false   -- was_ai_suggestion_edited
)
RETURNING *;
```

**Fetch with Category Query:**
```sql
SELECT 
  e.*,
  c.id as "category.id",
  c.name as "category.name"
FROM expenses e
INNER JOIN categories c ON e.category_id = c.id
WHERE e.id = $1;
```

### Data Transformation
- `amount`: number → `string` (e.g., 45.50 → "45.50")
- `expense_date`: validated string remains string (YYYY-MM-DD)
- `created_at`, `updated_at`: `timestamptz` → ISO 8601 string
- `category`: Nested object with id and name
- `created_by_ai`: Always set to false
- `was_ai_suggestion_edited`: Always set to false

## 6. Security Considerations

### Authentication
- **JWT Token Validation**: Handled by Supabase middleware
- **Token Expiration**: Supabase validates token expiration
- **Token Format**: Bearer token in Authorization header
- **Note**: Authentication not yet implemented, will be added later

### Authorization
- **Row Level Security (RLS)**: Enabled on expenses table
  ```sql
  CREATE POLICY "Allow individual insert access" ON expenses
    FOR INSERT
    USING (auth.uid() = user_id);
  ```
- **User ID Enforcement**: Service layer sets user_id from authenticated user
- **Ownership**: Users can only create expenses for themselves

### Input Validation
- **UUID Format**: Prevents SQL injection and invalid queries
- **Amount Validation**: Prevents negative values, excessive decimals, overflow
- **Date Validation**: Prevents future dates, invalid dates
- **Currency Validation**: Restricts to supported currencies
- **Zod Schema**: Type-safe validation with clear error messages

### Data Integrity
- **Category Existence**: Verified before insert to prevent orphaned records
- **Foreign Key Constraints**: Database enforces referential integrity
- **Default Values**: created_by_ai and was_ai_suggestion_edited set server-side
- **Immutable Fields**: User cannot set id, user_id, timestamps, AI flags

### Mass Assignment Prevention
- **Whitelist Approach**: Only accept fields from CreateExpenseCommand
- **Ignore Extra Fields**: Zod schema strips unknown properties
- **Server-Side Defaults**: AI flags and user_id set by server, not client

### Additional Security Measures
- **HTTPS Only**: All API requests use HTTPS in production
- **Rate Limiting**: Consider implementing per-user rate limits
- **CORS Configuration**: Properly configured CORS headers
- **SQL Injection Prevention**: Supabase uses parameterized queries
- **Input Sanitization**: Zod validates and transforms input safely

## 7. Error Handling

### Error Scenarios and Handling Strategy

#### 1. Missing Required Fields (400 Bad Request)
**Trigger:** Request body missing category_id, amount, or expense_date
**Detection:** Zod validation fails
**Handling:**
```typescript
const validationResult = CreateExpenseSchema.safeParse(requestBody);

if (!validationResult.success) {
  const errors = validationResult.error.flatten().fieldErrors;
  return new Response(
    JSON.stringify({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors
      }
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

#### 2. Invalid UUID Format (400 Bad Request)
**Trigger:** category_id is not valid UUID format
**Detection:** Zod UUID validation fails
**Handling:**
```typescript
// Handled by Zod schema validation
// Returns 400 with message: "Category ID must be a valid UUID"
```

#### 3. Invalid Amount (400 Bad Request)
**Trigger:** Amount is negative, zero, has >2 decimals, or exceeds max
**Detection:** Zod amount validation fails
**Handling:**
```typescript
// Handled by Zod schema validation
// Returns 400 with message: "Amount must be a positive number with max 2 decimal places"
```

#### 4. Invalid Date Format (400 Bad Request)
**Trigger:** Date not in YYYY-MM-DD format or invalid date
**Detection:** Zod date validation fails
**Handling:**
```typescript
// Handled by Zod schema validation
// Returns 400 with message: "Invalid date format or date cannot be in the future"
```

#### 5. Future Date (400 Bad Request)
**Trigger:** expense_date is after today
**Detection:** Zod date refinement fails
**Handling:**
```typescript
// Handled by Zod schema validation
// Returns 400 with message: "Expense date cannot be in the future"
```

#### 6. Unsupported Currency (400 Bad Request)
**Trigger:** Currency is not 'PLN'
**Detection:** Zod currency validation fails
**Handling:**
```typescript
// Handled by Zod schema validation
// Returns 400 with message: "Only PLN currency is supported in MVP"
```

#### 7. Category Not Found (422 Unprocessable Entity)
**Trigger:** Valid UUID but category doesn't exist in database
**Detection:** Category validation query returns no results
**Handling:**
```typescript
const categoryExists = await validateCategories(supabase, [category_id]);

if (!categoryExists.valid) {
  return new Response(
    JSON.stringify({
      error: {
        code: 'CATEGORY_NOT_FOUND',
        message: 'The specified category does not exist',
        details: { category_id }
      }
    }),
    { status: 422, headers: { 'Content-Type': 'application/json' } }
  );
}
```

#### 8. Missing or Invalid Authentication (401 Unauthorized)
**Trigger:** No Authorization header or invalid/expired token
**Detection:** Supabase middleware fails to authenticate
**Handling:** Middleware returns 401 before reaching route handler (when implemented)

#### 9. Database Connection Error (500 Internal Server Error)
**Trigger:** Database unavailable or connection timeout
**Detection:** Supabase client throws error
**Handling:**
```typescript
try {
  const expense = await createExpense(supabase, userId, validatedData);
} catch (error) {
  console.error('Database error in POST /api/expenses:', error);
  return new Response(
    JSON.stringify({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
        details: { timestamp: new Date().toISOString() }
      }
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

#### 10. Unexpected Server Error (500 Internal Server Error)
**Trigger:** Unhandled exception in route handler
**Detection:** Top-level try-catch
**Handling:**
```typescript
try {
  // ... route handler logic
} catch (error) {
  console.error('Unexpected error in POST /api/expenses:', error);
  return new Response(
    JSON.stringify({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again later.'
      }
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Error Logging Strategy
- **Console Logging**: Use `console.error()` for server-side errors
- **Error Context**: Include timestamp, user_id (if available), request data (sanitized)
- **Sensitive Data**: Never log tokens, passwords, or full request bodies
- **Production vs Development**: More verbose logging in development
- **Error Tracking**: Consider integrating error tracking service (Sentry, etc.)

### Date Warning (Non-Blocking)
**Trigger:** expense_date is more than 1 year in the past
**Handling:** Log warning but allow creation
```typescript
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

if (new Date(expense_date) < oneYearAgo) {
  console.warn(`Expense date is more than 1 year old: ${expense_date}`);
  // Continue with creation - this is just a warning
}
```

## 8. Performance Considerations

### Database Optimization
- **Category Validation**: Single query to check existence
- **Insert with Return**: Use RETURNING clause to get created record
- **Single Query for Response**: Fetch expense with category in one query using join
- **Indexed Queries**: Primary key and foreign key lookups are automatically indexed
- **RLS Performance**: RLS policies use indexed user_id column

### Query Performance
- **Expected Insert Time**: < 50ms for single expense creation
- **Category Validation**: < 10ms (indexed primary key lookup)
- **Network Latency**: Primary factor in total response time
- **Connection Pooling**: Supabase handles connection pooling automatically

### Validation Performance
- **Zod Validation**: < 1ms for schema validation
- **Early Validation**: Validate before database operations to reduce load
- **Fail Fast**: Return errors immediately on validation failure

### Potential Bottlenecks
1. **Category Validation Query**: Additional database round-trip
   - Mitigation: Could cache categories client-side, but validation still needed server-side
2. **Network Latency**: Distance between client and Supabase server
   - Mitigation: Use CDN for static assets, consider edge functions
3. **RLS Policy Evaluation**: Additional overhead on insert
   - Mitigation: Minimal impact, policies are optimized by PostgreSQL

### Optimization Strategies
- **Batch Creation**: For multiple expenses, use `/api/expenses/batch` endpoint
- **Client-Side Validation**: Validate on client before sending request
- **Category Caching**: Cache category list on client to reduce lookups
- **Response Compression**: Enable gzip compression for responses

### Monitoring Recommendations
- Track response times for 95th and 99th percentiles
- Monitor validation failure rates by field
- Track category validation failures (may indicate stale client data)
- Alert on error rate spikes
- Monitor database query performance

## 9. Implementation Steps

### Step 1: Add Validation Schema
**File:** `src/lib/validation/expense.validation.ts`

Add the following export to the existing file:

```typescript
/**
 * Validation schema for creating a single expense manually
 * Used in: POST /api/expenses
 */
export const CreateExpenseSchema = z.object({
  category_id: z.string().uuid({
    message: 'Category ID must be a valid UUID'
  }),
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
    ),
  expense_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
    .refine(
      (date) => !isNaN(Date.parse(date)),
      { message: 'Invalid date' }
    )
    .refine(
      (date) => new Date(date) <= new Date(),
      { message: 'Expense date cannot be in the future' }
    ),
  currency: z.string()
    .length(3, { message: 'Currency must be a 3-letter code' })
    .toUpperCase()
    .default('PLN')
    .refine(
      (curr) => curr === 'PLN',
      { message: 'Only PLN currency is supported in MVP' }
    )
    .optional()
});
```

### Step 2: Add Service Method
**File:** `src/lib/services/expense.service.ts`

Add the following function to the existing service:

```typescript
/**
 * Creates a single expense manually
 * Includes nested category information in response
 * Note: Authentication will be added later
 * 
 * @param supabase - Supabase client instance
 * @param userId - ID of the user creating the expense (from auth when implemented)
 * @param expenseData - Validated expense data
 * @returns Created expense with nested category
 */
export async function createExpense(
  supabase: SupabaseClient,
  userId: string,
  expenseData: CreateExpenseCommand
): Promise<ExpenseDTO> {
  // Prepare insert data with user_id and default values
  const insertData = {
    user_id: userId,
    category_id: expenseData.category_id,
    amount: expenseData.amount,
    expense_date: expenseData.expense_date,
    currency: expenseData.currency || 'PLN',
    created_by_ai: false,
    was_ai_suggestion_edited: false,
  };

  // Insert expense and fetch with category information
  const { data, error } = await supabase
    .from('expenses')
    .insert(insertData)
    .select(`
      *,
      category:categories(id, name)
    `)
    .single();

  if (error) {
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

### Step 3: Update Route Handler
**File:** `src/pages/api/expenses/index.ts`

Add POST handler to the existing file (which currently has GET handler):

```typescript
import type { APIRoute } from 'astro';
import { createExpense } from '../../../lib/services/expense.service';
import { validateCategories } from '../../../lib/services/expense.service';
import { CreateExpenseSchema } from '../../../lib/validation/expense.validation';

// ... existing GET handler ...

/**
 * POST /api/expenses
 * Creates a single expense manually
 * Note: Authentication will be implemented later
 */
export const POST: APIRoute = async (context) => {
  try {
    // Get Supabase client from middleware
    const supabase = context.locals.supabase;

    // Parse request body
    let requestBody;
    try {
      requestBody = await context.request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate request body
    const validationResult = CreateExpenseSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors,
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const validatedData = validationResult.data;

    // Validate category exists
    const categoryValidation = await validateCategories(supabase, [validatedData.category_id]);

    if (!categoryValidation.valid) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: 'The specified category does not exist',
            details: {
              category_id: validatedData.category_id,
            },
          },
        }),
        {
422,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Log warning if date is more than 1 year old (non-blocking)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (new Date(validatedData.expense_date) < oneYearAgo) {
      console.warn(`Expense date is more than 1 year old: ${validatedData.expense_date}`);
    }

    // TODO: Get user_id from authenticated user when auth is implemented
    // For now, use a placeholder or get from request
    const userId = 'a33573a0-3562-495e-b3c4-d898d0b54241'; // Temporary placeholder

    // Create expense
    const expense = await createExpense(supabase, userId, validatedData);

    // Return success response
    return new Response(JSON.stringify(expense), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log error for debugging
    console.error('Error in POST /api/expenses:', error);

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

// Disable prerendering for this API route
export const prerender = false;
```

### Step 4: Update Type Imports
**File:** `src/lib/services/expense.service.ts`

Ensure the import statement includes CreateExpenseCommand:

```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type { 
  BatchExpenseItem, 
  ExpenseDTO, 
  ExpenseListDTO, 
  ExpenseQueryParams, 
  CategoryDTO,
  CreateExpenseCommand  // Add this
} from '../../types';
```

### Step 5: Test the Endpoint

#### Manual Testing Checklist

1. **Valid Request Test**
   ```powershell
   $body = @{
     category_id = "a079cedc-862f-4bc2-94c3-b602a3a9761e"
     amount = "45.50"
     expense_date = "2024-01-15"
     currency = "PLN"
   } | ConvertTo-Json
   
   Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" `
     -Method POST `
     -Body $body `
     -ContentType "application/json"
   ```
   - Verify 201 Created status
   - Verify response includes all fields
   - Verify created_by_ai=false and was_ai_suggestion_edited=false

2. **Missing Required Field Test**
   ```powershell
   $body = @{
     amount = "45.50"
     expense_date = "2024-01-15"
   } | ConvertTo-Json
   
   Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" `
     -Method POST `
     -Body $body `
     -ContentType "application/json"
   ```
   - Verify 400 Bad Request
   - Verify error message mentions missing category_id

3. **Invalid UUID Format Test**
   ```powershell
   $body = @{
     category_id = "invalid-uuid"
     amount = "45.50"
     expense_date = "2024-01-15"
   } | ConvertTo-Json
   
   Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" `
     -Method POST `
     -Body $body `
     -ContentType "application/json"
   ```
   - Verify 400 Bad Request
   - Verify error about invalid UUID

4. **Invalid Amount Test (Negative)**
   ```powershell
   $body = @{
     category_id = "a079cedc-862f-4bc2-94c3-b602a3a9761e"
     amount = "-45.50"
     expense_date = "2024-01-15"
   } | ConvertTo-Json
   
   Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" `
     -Method POST `
     -Body $body `
     -ContentType "application/json"
   ```
   - Verify 400 Bad Request
   - Verify error about positive amount

5. **Invalid Amount Test (Too Many Decimals)**
   ```powershell
   $body = @{
     category_id = "a079cedc-862f-4bc2-94c3-b602a3a9761e"
     amount = "45.555"
     expense_date = "2024-01-15"
   } | ConvertTo-Json
   
   Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" `
     -Method POST `
     -Body $body `
     -ContentType "application/json"
   ```
   - Verify 400 Bad Request
   - Verify error about max 2 decimal places

6. **Future Date Test**
   ```powershell
   $body = @{
     category_id = "a079cedc-862f-4bc2-94c3-b602a3a9761e"
     amount = "45.50"
     expense_date = "2025-12-31"
   } | ConvertTo-Json
   
   Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" `
     -Method POST `
     -Body $body `
     -ContentType "application/json"
   ```
   - Verify 400 Bad Request
   - Verify error about future date

7. **Invalid Date Format Test**
   ```powershell
   $body = @{
     category_id = "a079cedc-862f-4bc2-94c3-b602a3a9761e"
     amount = "45.50"
     expense_date = "15-01-2024"
   } | ConvertTo-Json
   
   Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" `
     -Method POST `
     -Body $body `
     -ContentType "application/json"
   ```
   - Verify 400 Bad Request
   - Verify error about date format

8. **Unsupported Currency Test**
   ```powershell
   $body = @{
     category_id = "a079cedc-862f-4bc2-94c3-b602a3a9761e"
     amount = "45.50"
     expense_date = "2024-01-15"
     currency = "USD"
   } | ConvertTo-Json
   
   Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" `
     -Method POST `
     -Body $body `
     -ContentType "application/json"
   ```
   - Verify 400 Bad Request
   - Verify error about PLN only

9. **Non-Existent Category Test**
   ```powershell
   $body = @{
     category_id = "00000000-0000-0000-0000-000000000000"
     amount = "45.50"
     expense_date = "2024-01-15"
   } | ConvertTo-Json
   
   Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" `
     -Method POST `
     -Body $body `
     -ContentType "application/json"
   ```
   - Verify 422 Unprocessable Entity
   - Verify error about category not found

10. **Default Currency Test**
    ```powershell
    $body = @{
      category_id = "a079cedc-862f-4bc2-94c3-b602a3a9761e"
      amount = "45.50"
      expense_date = "2024-01-15"
    } | ConvertTo-Json
    
    Invoke-WebRequest -Uri "http://localhost:3000/api/expenses" `
      -Method POST `
      -Body $body `
      -ContentType "application/json"
    ```
    - Verify 201 Created
    - Verify currency defaults to "PLN"

#### Automated Test Cases (Future)
```typescript
describe('POST /api/expenses', () => {
  it('should create expense with valid data', async () => {
    // Test implementation
  });

  it('should return 400 for missing required fields', async () => {
    // Test implementation
  });

  it('should return 400 for invalid UUID', async () => {
    // Test implementation
  });

  it('should return 400 for negative amount', async () => {
    // Test implementation
  });

  it('should return 400 for too many decimal places', async () => {
    // Test implementation
  });

  it('should return 400 for future date', async () => {
    // Test implementation
  });

  it('should return 400 for unsupported currency', async () => {
    // Test implementation
  });

  it('should return 422 for non-existent category', async () => {
    // Test implementation
  });

  it('should default currency to PLN', async () => {
    // Test implementation
  });

  it('should set created_by_ai to false', async () => {
    // Test implementation
  });
});
```

### Step 6: Documentation Updates
1. Update API documentation with endpoint details
2. Add example requests/responses to developer docs
3. Update Postman/Insomnia collection with new endpoint
4. Document validation rules and error codes
5. Add examples of valid and invalid requests

### Step 7: Monitoring Setup (Future)
1. Add endpoint to monitoring dashboard
2. Set up alerts for high error rates
3. Track response time metrics
4. Monitor validation failure rates by field
5. Track category validation failures

## 10. Additional Notes

### Future Enhancements
- **Bulk Import**: Support CSV/Excel import for multiple expenses
- **Receipt Attachment**: Allow attaching receipt images to manual expenses
- **Recurring Expenses**: Support for recurring expense templates
- **Multi-Currency**: Support for multiple currencies with exchange rates
- **Tags/Labels**: Additional categorization beyond categories
- **Notes Field**: Allow users to add notes to expenses

### Related Endpoints
- `GET /api/expenses` - List all expenses (with filtering)
- `GET /api/expenses/{id}` - Get single expense
- `POST /api/expenses/batch` - Create multiple expenses (from AI)
- `PATCH /api/expenses/{id}` - Update expense
- `DELETE /api/expenses/{id}` - Delete expense
- `GET /api/categories` - List all categories (needed for dropdown)

### Dependencies
- Supabase client (authentication and database)
- Zod (input validation)
- Astro (routing and middleware)
- Existing expense service methods (validateCategories)

### Breaking Changes
None - This is a new endpoint implementation.

### Migration Notes
When authentication is implemented:
1. Remove placeholder user_id
2. Get user_id from authenticated session
3. Add authentication check at route handler start
4. Update tests to include authentication
5. Update documentation with authentication requirements
          status: 
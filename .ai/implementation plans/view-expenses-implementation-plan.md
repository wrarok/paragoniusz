# API Endpoint Implementation Plan: List User Expenses

## 1. Endpoint Overview

This endpoint retrieves a paginated list of expenses for the authenticated user with support for filtering by date range and category, as well as sorting by date or amount. The endpoint leverages Supabase's Row Level Security (RLS) to ensure users can only access their own expense data.

**Key Features:**

- Pagination with configurable limit and offset
- Date range filtering (from_date, to_date)
- Category filtering
- Flexible sorting (by date or amount, ascending or descending)
- Automatic category information inclusion via database join
- Total count for pagination UI

## 2. Request Details

### HTTP Method

`GET`

### URL Structure

`/api/expenses`

### Headers

- `Authorization: Bearer {access_token}` (required)

### Query Parameters

#### Required

None (all parameters are optional)

#### Optional

- `limit` (number)
  - Default: 50
  - Maximum: 100
  - Minimum: 1
  - Description: Number of records to return per page
- `offset` (number)
  - Default: 0
  - Minimum: 0
  - Description: Number of records to skip for pagination
- `from_date` (string)
  - Format: YYYY-MM-DD
  - Description: Filter expenses from this date (inclusive)
- `to_date` (string)
  - Format: YYYY-MM-DD
  - Description: Filter expenses to this date (inclusive)
- `category_id` (string)
  - Format: UUID
  - Description: Filter expenses by specific category
- `sort` (string)
  - Allowed values: `expense_date.asc`, `expense_date.desc`, `amount.asc`, `amount.desc`
  - Default: `expense_date.desc`
  - Description: Sort order for results

### Request Body

None (GET request)

## 3. Used Types

### From `src/types.ts`

#### Response Types

```typescript
ExpenseListDTO {
  data: ExpenseDTO[];
  count: number;
  total: number;
}

ExpenseDTO {
  id: string;
  user_id: string;
  category_id: string;
  amount: string;
  expense_date: string;
  currency: string;
  created_by_ai: boolean;
  was_ai_suggestion_edited: boolean;
  created_at: string;
  updated_at: string;
  category: CategoryDTO;
}

CategoryDTO {
  id: string;
  name: string;
}
```

#### Query Parameters Type

```typescript
ExpenseQueryParams {
  limit?: number;
  offset?: number;
  from_date?: string;
  to_date?: string;
  category_id?: string;
  sort?: 'expense_date.asc' | 'expense_date.desc' | 'amount.asc' | 'amount.desc';
}
```

#### Error Response Type

```typescript
APIErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### Validation Schema (to be created)

```typescript
// Using Zod for input validation
const ExpenseQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    from_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    category_id: z.string().uuid().optional(),
    sort: z.enum(["expense_date.asc", "expense_date.desc", "amount.asc", "amount.desc"]).default("expense_date.desc"),
  })
  .refine(
    (data) => {
      if (data.from_date && data.to_date) {
        return new Date(data.from_date) <= new Date(data.to_date);
      }
      return true;
    },
    {
      message: "from_date must be before or equal to to_date",
      path: ["from_date"],
    }
  );
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "category_id": "789e0123-e89b-12d3-a456-426614174000",
      "category": {
        "id": "789e0123-e89b-12d3-a456-426614174000",
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
  ],
  "count": 1,
  "total": 150
}
```

**Response Fields:**

- `data`: Array of expense records with nested category information
- `count`: Number of records returned in current page
- `total`: Total number of records matching the filters (for pagination)

### Error Responses

#### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired authentication token"
  }
}
```

**Triggers:**

- Missing Authorization header
- Invalid JWT token format
- Expired JWT token
- Token doesn't correspond to a valid user

#### 400 Bad Request

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid query parameters",
    "details": {
      "limit": "Must be between 1 and 100",
      "from_date": "Must be in YYYY-MM-DD format"
    }
  }
}
```

**Triggers:**

- Invalid limit value (< 1 or > 100)
- Invalid offset value (< 0)
- Invalid date format
- from_date is after to_date
- Invalid UUID format for category_id
- Invalid sort parameter value

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

- Database connection failure
- Unexpected errors during query execution

## 5. Data Flow

### Request Flow

1. **Request Reception**: Astro API route receives GET request at `/api/expenses`
2. **Authentication**: Middleware extracts and validates JWT token from Authorization header
3. **User Context**: Supabase client is attached to `context.locals` with user session
4. **Parameter Extraction**: Query parameters are extracted from URL
5. **Input Validation**: Zod schema validates all query parameters
6. **Service Invocation**: Call `expenseService.listExpenses()` with validated parameters
7. **Database Query**: Service constructs and executes Supabase query with:
   - RLS automatically filters by authenticated user
   - Date range filters applied
   - Category filter applied
   - Sorting applied
   - Pagination applied
   - Category join for nested data
8. **Count Query**: Separate query to get total count (without pagination)
9. **Response Formatting**: Transform database results to `ExpenseListDTO`
10. **Response Return**: Send JSON response with 200 status code

### Database Interactions

#### Main Query (with pagination)

```typescript
let query = supabase
  .from("expenses")
  .select(
    `
    *,
    category:categories(id, name)
  `
  )
  .order(sortColumn, { ascending: sortAscending })
  .range(offset, offset + limit - 1);

// Apply filters
if (from_date) query = query.gte("expense_date", from_date);
if (to_date) query = query.lte("expense_date", to_date);
if (category_id) query = query.eq("category_id", category_id);
```

#### Count Query (without pagination)

```typescript
let countQuery = supabase.from("expenses").select("*", { count: "exact", head: true });

// Apply same filters as main query
if (from_date) countQuery = countQuery.gte("expense_date", from_date);
if (to_date) countQuery = countQuery.lte("expense_date", to_date);
if (category_id) countQuery = countQuery.eq("category_id", category_id);
```

### RLS Policy Application

The database query automatically applies the RLS policy:

```sql
-- Policy: Allow individual read access
-- Check: auth.uid() = user_id
```

This ensures users can only retrieve their own expenses without explicit filtering in the application code.

## 6. Security Considerations

### Authentication & Authorization

- **JWT Validation**: Middleware validates Bearer token before processing request
- **User Context**: Supabase client automatically includes user context from validated JWT
- **RLS Enforcement**: Database-level security ensures data isolation between users
- **No User ID in Query**: User filtering is handled by RLS, not application code

### Input Validation

- **Type Safety**: TypeScript ensures type correctness at compile time
- **Runtime Validation**: Zod schema validates all inputs at runtime
- **SQL Injection Prevention**: Supabase client uses parameterized queries
- **UUID Validation**: Category ID validated as proper UUID format
- **Date Validation**: Date strings validated against YYYY-MM-DD format
- **Range Validation**: Limit capped at 100 to prevent resource exhaustion

### Data Protection

- **Minimal Exposure**: Only necessary fields returned in response
- **No Sensitive Data**: Amount returned as string to prevent precision issues
- **Category Join**: Controlled join prevents data leakage from categories table

### Rate Limiting Considerations

- **Pagination Limits**: Max 100 records per request prevents large data dumps
- **Query Complexity**: Simple filters and sorts keep query execution fast
- **Index Usage**: Composite index on (user_id, expense_date) optimizes common queries

## 7. Error Handling

### Validation Errors (400 Bad Request)

#### Invalid Limit

```typescript
if (limit < 1 || limit > 100) {
  return new Response(
    JSON.stringify({
      error: {
        code: "INVALID_INPUT",
        message: "Invalid query parameters",
        details: { limit: "Must be between 1 and 100" },
      },
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

#### Invalid Date Format

```typescript
if (from_date && !/^\d{4}-\d{2}-\d{2}$/.test(from_date)) {
  return new Response(
    JSON.stringify({
      error: {
        code: "INVALID_INPUT",
        message: "Invalid query parameters",
        details: { from_date: "Must be in YYYY-MM-DD format" },
      },
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

#### Invalid Date Range

```typescript
if (from_date && to_date && new Date(from_date) > new Date(to_date)) {
  return new Response(
    JSON.stringify({
      error: {
        code: "INVALID_INPUT",
        message: "Invalid query parameters",
        details: { from_date: "Must be before or equal to to_date" },
      },
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

#### Invalid UUID

```typescript
if (category_id && !isValidUUID(category_id)) {
  return new Response(
    JSON.stringify({
      error: {
        code: "INVALID_INPUT",
        message: "Invalid query parameters",
        details: { category_id: "Must be a valid UUID" },
      },
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

### Authentication Errors (401 Unauthorized)

#### Missing Token

```typescript
const authHeader = request.headers.get("Authorization");
if (!authHeader || !authHeader.startsWith("Bearer ")) {
  return new Response(
    JSON.stringify({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

#### Invalid/Expired Token

```typescript
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (error || !user) {
  return new Response(
    JSON.stringify({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired authentication token",
      },
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

### Database Errors (500 Internal Server Error)

#### Query Execution Failure

```typescript
try {
  const result = await expenseService.listExpenses(user.id, validatedParams);
  // ... handle result
} catch (error) {
  console.error("Failed to fetch expenses:", error);
  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while fetching expenses",
      },
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

## 8. Performance Considerations

### Database Optimization

- **Index Usage**: Composite index `expenses_user_id_expense_date_idx` on `(user_id, expense_date DESC)` optimizes the most common query pattern
- **Selective Joins**: Only join categories table, not full profile data
- **Pagination**: Limit results to prevent large data transfers
- **Count Optimization**: Use `count: 'exact', head: true` for efficient counting

### Query Patterns

- **Default Sort**: `expense_date.desc` aligns with index for optimal performance
- **Date Range Filters**: Use indexed `expense_date` column for efficient filtering
- **Category Filter**: Uses foreign key index on `category_id`

### Potential Bottlenecks

- **Large Date Ranges**: Queries spanning many months may be slow
  - Mitigation: Encourage users to use date filters
  - Consider: Add warning for queries without date filters
- **High Offset Values**: Deep pagination can be slow
  - Mitigation: Max limit of 100 reduces impact
  - Consider: Implement cursor-based pagination in future
- **Concurrent Requests**: Multiple simultaneous queries from same user
  - Mitigation: Supabase connection pooling handles this

### Caching Considerations

- **No Caching**: Data changes frequently, caching not recommended
- **Client-Side**: Frontend can cache results for short periods
- **Future Enhancement**: Consider Redis cache for dashboard summaries

## 9. Implementation Steps

### Step 1: Create Validation Schema

**File**: `src/lib/validation/expense.validation.ts` (new file)

```typescript
import { z } from "zod";

export const ExpenseQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    from_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    category_id: z.string().uuid().optional(),
    sort: z.enum(["expense_date.asc", "expense_date.desc", "amount.asc", "amount.desc"]).default("expense_date.desc"),
  })
  .refine(
    (data) => {
      if (data.from_date && data.to_date) {
        return new Date(data.from_date) <= new Date(data.to_date);
      }
      return true;
    },
    {
      message: "from_date must be before or equal to to_date",
      path: ["from_date"],
    }
  );
```

### Step 2: Add Service Method

**File**: `src/lib/services/expense.service.ts` (modify existing)

Add method to existing service:

```typescript
async listExpenses(
  supabase: SupabaseClient<Database>,
  params: ExpenseQueryParams
): Promise<ExpenseListDTO> {
  const {
    limit = 50,
    offset = 0,
    from_date,
    to_date,
    category_id,
    sort = 'expense_date.desc'
  } = params;

  // Parse sort parameter
  const [sortColumn, sortDirection] = sort.split('.');
  const sortAscending = sortDirection === 'asc';

  // Build main query with pagination
  let query = supabase
    .from('expenses')
    .select(`
      *,
      category:categories(id, name)
    `)
    .order(sortColumn, { ascending: sortAscending })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (from_date) query = query.gte('expense_date', from_date);
  if (to_date) query = query.lte('expense_date', to_date);
  if (category_id) query = query.eq('category_id', category_id);

  // Execute main query
  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  // Build count query (same filters, no pagination)
  let countQuery = supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true });

  if (from_date) countQuery = countQuery.gte('expense_date', from_date);
  if (to_date) countQuery = countQuery.lte('expense_date', to_date);
  if (category_id) countQuery = countQuery.eq('category_id', category_id);

  // Execute count query
  const { count, error: countError } = await countQuery;

  if (countError) {
    throw new Error(`Failed to count expenses: ${countError.message}`);
  }

  // Transform data to DTOs
  const expenses: ExpenseDTO[] = (data || []).map(expense => ({
    ...expense,
    amount: expense.amount.toString(),
    category: expense.category as CategoryDTO
  }));

  return {
    data: expenses,
    count: expenses.length,
    total: count || 0
  };
}
```

### Step 3: Create API Route Handler

**File**: `src/pages/api/expenses/index.ts` (new file)

```typescript
import type { APIRoute } from "astro";
import { ExpenseQuerySchema } from "../../../lib/validation/expense.validation";
import { listExpenses } from "../../../lib/services/expense.service";
import type { APIErrorResponse, ExpenseQueryParams } from "../../../types";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Get Supabase client from middleware
    const supabase = locals.supabase;

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse: APIErrorResponse = {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired authentication token",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const rawParams = {
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
      from_date: url.searchParams.get("from_date"),
      to_date: url.searchParams.get("to_date"),
      category_id: url.searchParams.get("category_id"),
      sort: url.searchParams.get("sort"),
    };

    // Validate with Zod
    const validationResult = ExpenseQuerySchema.safeParse(rawParams);

    if (!validationResult.success) {
      const errorResponse: APIErrorResponse = {
        error: {
          code: "INVALID_INPUT",
          message: "Invalid query parameters",
          details: validationResult.error.flatten().fieldErrors,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validatedParams = validationResult.data as ExpenseQueryParams;

    // Fetch expenses using service
    const result = await listExpenses(supabase, validatedParams);

    // Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in GET /api/expenses:", error);

    const errorResponse: APIErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while fetching expenses",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Step 4: Test Authentication

- Test with missing Authorization header → expect 401
- Test with invalid token → expect 401
- Test with expired token → expect 401
- Test with valid token → expect 200

### Step 5: Test Input Validation

- Test with limit = 0 → expect 400
- Test with limit = 101 → expect 400
- Test with offset = -1 → expect 400
- Test with invalid date format → expect 400
- Test with from_date > to_date → expect 400
- Test with invalid UUID for category_id → expect 400
- Test with invalid sort value → expect 400

### Step 6: Test Data Retrieval

- Test with no parameters → expect default pagination (50 records, offset 0)
- Test with custom limit and offset → verify correct pagination
- Test with date range filter → verify only expenses in range returned
- Test with category filter → verify only expenses in category returned
- Test with different sort options → verify correct ordering
- Test with combined filters → verify all filters applied correctly

### Step 7: Test RLS Enforcement

- Create expenses for multiple users
- Verify each user only sees their own expenses
- Verify total count reflects only user's expenses

### Step 8: Performance Testing

- Test with large datasets (1000+ expenses)
- Verify query execution time is acceptable
- Verify index usage with EXPLAIN ANALYZE
- Test deep pagination (high offset values)

### Step 9: Integration Testing

- Test full flow from frontend to database
- Verify response format matches ExpenseListDTO
- Verify category information is properly nested
- Verify amount is returned as string

### Step 10: Documentation

- Update API documentation with endpoint details
- Document query parameter options
- Provide example requests and responses
- Document error codes and their meanings

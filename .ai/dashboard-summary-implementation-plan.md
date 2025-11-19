# API Endpoint Implementation Plan: Get Dashboard Summary

## 1. Endpoint Overview

The `GET /api/dashboard/summary` endpoint provides aggregated expense analytics for a specified month. It returns comprehensive statistics including total spending, category breakdowns with percentages, and AI usage metrics. This endpoint serves as the primary data source for the user's dashboard view, enabling users to understand their spending patterns and the effectiveness of AI-assisted expense tracking.

**Key Features:**
- Aggregates expenses by category for a given month
- Calculates spending percentages per category
- Tracks AI-created and AI-edited expenses
- Handles uncategorized expenses as "Other"
- Defaults to current month if no month specified

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
`/api/dashboard/summary`

### Headers
- `Authorization: Bearer {access_token}` (required) - JWT token from Supabase Auth

### Query Parameters

**Optional:**
- `month` (string, format: YYYY-MM)
  - Description: The month to retrieve summary for
  - Default: Current month in UTC
  - Example: `2024-01`
  - Validation: Must match YYYY-MM format, valid month (01-12), reasonable year range

### Request Examples

```http
GET /api/dashboard/summary HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

```http
GET /api/dashboard/summary?month=2024-01 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Used Types

### From `src/types.ts`

**Response Types:**
- `DashboardSummaryDTO` - Main response structure
- `CategorySummaryDTO` - Individual category statistics
- `AIMetricsDTO` - AI usage metrics

**Query Types:**
- `DashboardQueryParams` - Query parameter validation

**Entity Types:**
- `Expense` - Database expense entity
- `Category` - Database category entity

### New Validation Schema (Zod)

```typescript
// src/lib/validation/dashboard.validation.ts
import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format')
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const [year] = val.split('-').map(Number);
        return year >= 2000 && year <= 2099;
      },
      { message: 'Year must be between 2000 and 2099' }
    ),
});
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "period": {
    "month": "2024-01",
    "from_date": "2024-01-01",
    "to_date": "2024-01-31"
  },
  "total_amount": "1250.75",
  "currency": "PLN",
  "expense_count": 45,
  "categories": [
    {
      "category_id": "uuid",
      "category_name": "Groceries",
      "amount": "450.50",
      "percentage": 36.0,
      "count": 15
    },
    {
      "category_id": null,
      "category_name": "Other",
      "amount": "50.00",
      "percentage": 4.0,
      "count": 3
    }
  ],
  "ai_metrics": {
    "ai_created_count": 30,
    "ai_created_percentage": 66.7,
    "ai_edited_count": 5,
    "ai_accuracy_percentage": 83.3
  }
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
    "code": "INVALID_INPUT",
    "message": "Invalid month format",
    "details": {
      "month": ["Month must be in YYYY-MM format"]
    }
  }
}
```

**500 Internal Server Error**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to retrieve dashboard summary"
  }
}
```

## 5. Data Flow

### Step-by-Step Process

1. **Request Reception**
   - Astro API route receives GET request
   - Middleware validates JWT token and attaches user context

2. **Input Validation**
   - Extract `month` query parameter
   - Validate format using Zod schema
   - Default to current month if not provided
   - Calculate date range (first and last day of month)

3. **Authentication Check**
   - Verify user is authenticated via `context.locals.supabase.auth.getUser()`
   - Return 401 if authentication fails

4. **Service Layer Invocation**
   - Call `DashboardService.getSummary(userId, fromDate, toDate)`
   - Service handles all business logic

5. **Database Queries** (within service)
   - Query expenses table with filters:
     - `user_id = authenticated_user_id`
     - `expense_date >= from_date`
     - `expense_date <= to_date`
   - Join with categories table
   - RLS policies automatically enforce user isolation

6. **Data Aggregation** (within service)
   - Calculate total amount across all expenses
   - Group expenses by category
   - Calculate per-category totals and counts
   - Compute percentages relative to total
   - Handle uncategorized expenses (category_id = null) as "Other"
   - Calculate AI metrics:
     - Count expenses where `created_by_ai = true`
     - Count expenses where `was_ai_suggestion_edited = true`
     - Calculate percentages

7. **Response Formatting**
   - Convert numeric amounts to strings
   - Sort categories by amount (descending)
   - Format dates as YYYY-MM-DD
   - Structure response as `DashboardSummaryDTO`

8. **Response Delivery**
   - Return 200 OK with JSON payload
   - Set appropriate content-type headers

### Database Interactions

**Primary Query:**
```sql
SELECT 
  e.id,
  e.amount,
  e.currency,
  e.created_by_ai,
  e.was_ai_suggestion_edited,
  c.id as category_id,
  c.name as category_name
FROM expenses e
LEFT JOIN categories c ON e.category_id = c.id
WHERE 
  e.user_id = $1 
  AND e.expense_date >= $2 
  AND e.expense_date <= $3
```

**Index Usage:**
- `expenses_user_id_expense_date_idx` will optimize this query

## 6. Security Considerations

### Authentication
- **JWT Validation**: Middleware validates Bearer token before route handler executes
- **User Context**: Extract user ID from validated JWT, never trust client input
- **Session Management**: Supabase handles token expiration and refresh

### Authorization
- **Row Level Security**: RLS policies on `expenses` table ensure users only access their own data
- **Query Filtering**: Always filter by authenticated user's ID
- **No Direct User Input**: User ID comes from JWT, not request parameters

### Data Validation
- **Input Sanitization**: Zod schema validates month format
- **SQL Injection Prevention**: Supabase client uses parameterized queries
- **Date Range Limits**: Restrict queries to single month to prevent expensive operations

### Data Privacy
- **User Isolation**: RLS policies prevent cross-user data access
- **Minimal Exposure**: Only return aggregated data, no sensitive details
- **Currency Consistency**: Validate all expenses use same currency (PLN)

### Rate Limiting Considerations
- Consider implementing rate limiting for dashboard endpoint
- Cache results for frequently accessed months
- Monitor query performance and set timeouts

## 7. Error Handling

### Error Scenarios and Responses

| Scenario | Status Code | Error Code | Message | Handling |
|----------|-------------|------------|---------|----------|
| Missing/invalid JWT | 401 | UNAUTHORIZED | Invalid or expired authentication token | Return immediately, log attempt |
| Invalid month format | 400 | INVALID_INPUT | Invalid month format | Validate with Zod, return validation errors |
| Month out of range | 400 | INVALID_INPUT | Year must be between 2000 and 2099 | Validate with Zod |
| Database connection failure | 500 | INTERNAL_ERROR | Failed to retrieve dashboard summary | Log error, return generic message |
| Query timeout | 500 | INTERNAL_ERROR | Request timeout | Log error, consider query optimization |
| Unexpected error | 500 | INTERNAL_ERROR | An unexpected error occurred | Log full error, return generic message |

### Error Handling Strategy

1. **Early Returns**: Validate authentication and input at the start
2. **Try-Catch Blocks**: Wrap service calls in try-catch
3. **Structured Logging**: Log errors with context (user_id, month, error details)
4. **User-Friendly Messages**: Never expose internal errors to client
5. **Error Tracking**: Consider integrating error monitoring (e.g., Sentry)

### Example Error Handler

```typescript
try {
  const summary = await dashboardService.getSummary(userId, fromDate, toDate);
  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
} catch (error) {
  console.error('Dashboard summary error:', {
    userId,
    month,
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  
  return new Response(
    JSON.stringify({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve dashboard summary',
      },
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

## 8. Performance Considerations

### Potential Bottlenecks

1. **Large Dataset Queries**: Users with thousands of expenses in a month
2. **Category Joins**: LEFT JOIN with categories table
3. **Aggregation Calculations**: Computing sums, counts, and percentages
4. **Multiple Database Roundtrips**: If not optimized

### Optimization Strategies

1. **Index Utilization**
   - Leverage `expenses_user_id_expense_date_idx` composite index
   - Ensure query planner uses index for date range filtering

2. **Single Query Approach**
   - Fetch all data in one query with JOIN
   - Perform aggregations in application layer (more flexible)
   - Alternative: Use database aggregation functions for better performance

3. **Response Caching**
   - Cache results for completed months (immutable data)
   - Use short TTL for current month (data changes frequently)
   - Consider Redis or in-memory cache

4. **Query Optimization**
   - Limit query scope to single month (already implemented)
   - Use `EXPLAIN ANALYZE` to verify query plan
   - Monitor slow query logs

5. **Pagination Considerations**
   - Dashboard summary doesn't need pagination (aggregated data)
   - Limit category list to top N categories if needed

### Performance Targets

- Response time: < 500ms for typical user (< 1000 expenses/month)
- Database query time: < 200ms
- Aggregation time: < 100ms
- Total endpoint latency: < 1000ms (including network)

## 9. Implementation Steps

### Step 1: Create Validation Schema
**File:** `src/lib/validation/dashboard.validation.ts`

```typescript
import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format')
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const [year] = val.split('-').map(Number);
        return year >= 2000 && year <= 2099;
      },
      { message: 'Year must be between 2000 and 2099' }
    ),
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
```

### Step 2: Create Dashboard Service
**File:** `src/lib/services/dashboard.service.ts`

```typescript
import type { SupabaseClient } from '../db/supabase.client';
import type { DashboardSummaryDTO, CategorySummaryDTO, AIMetricsDTO } from '../types';

export class DashboardService {
  constructor(private supabase: SupabaseClient) {}

  async getSummary(
    userId: string,
    fromDate: string,
    toDate: string
  ): Promise<DashboardSummaryDTO> {
    // Query expenses with category join
    const { data: expenses, error } = await this.supabase
      .from('expenses')
      .select('id, amount, currency, created_by_ai, was_ai_suggestion_edited, category_id, categories(id, name)')
      .eq('user_id', userId)
      .gte('expense_date', fromDate)
      .lte('expense_date', toDate);

    if (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }

    if (!expenses || expenses.length === 0) {
      return this.createEmptyResponse(fromDate, toDate);
    }

    // Calculate aggregations
    const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const currency = expenses[0].currency;
    const expenseCount = expenses.length;

    // Group by category
    const categoryMap = new Map<string | null, {
      id: string | null;
      name: string;
      amount: number;
      count: number;
    }>();

    expenses.forEach((expense) => {
      const categoryId = expense.category_id;
      const categoryName = expense.categories?.name || 'Other';
      
      const existing = categoryMap.get(categoryId);
      if (existing) {
        existing.amount += Number(expense.amount);
        existing.count += 1;
      } else {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          amount: Number(expense.amount),
          count: 1,
        });
      }
    });

    // Convert to array and calculate percentages
    const categories: CategorySummaryDTO[] = Array.from(categoryMap.values())
      .map((cat) => ({
        category_id: cat.id,
        category_name: cat.name,
        amount: cat.amount.toFixed(2),
        percentage: Number(((cat.amount / totalAmount) * 100).toFixed(1)),
        count: cat.count,
      }))
      .sort((a, b) => Number(b.amount) - Number(a.amount));

    // Calculate AI metrics
    const aiCreatedCount = expenses.filter((e) => e.created_by_ai).length;
    const aiEditedCount = expenses.filter((e) => e.was_ai_suggestion_edited).length;
    const aiCreatedPercentage = Number(((aiCreatedCount / expenseCount) * 100).toFixed(1));
    const aiAccuracyPercentage = aiCreatedCount > 0
      ? Number((((aiCreatedCount - aiEditedCount) / aiCreatedCount) * 100).toFixed(1))
      : 0;

    const aiMetrics: AIMetricsDTO = {
      ai_created_count: aiCreatedCount,
      ai_created_percentage: aiCreatedPercentage,
      ai_edited_count: aiEditedCount,
      ai_accuracy_percentage: aiAccuracyPercentage,
    };

    // Extract month from fromDate
    const month = fromDate.substring(0, 7); // YYYY-MM

    return {
      period: {
        month,
        from_date: fromDate,
        to_date: toDate,
      },
      total_amount: totalAmount.toFixed(2),
      currency,
      expense_count: expenseCount,
      categories,
      ai_metrics: aiMetrics,
    };
  }

  private createEmptyResponse(fromDate: string, toDate: string): DashboardSummaryDTO {
    const month = fromDate.substring(0, 7);
    return {
      period: {
        month,
        from_date: fromDate,
        to_date: toDate,
      },
      total_amount: '0.00',
      currency: 'PLN',
      expense_count: 0,
      categories: [],
      ai_metrics: {
        ai_created_count: 0,
        ai_created_percentage: 0,
        ai_edited_count: 0,
        ai_accuracy_percentage: 0,
      },
    };
  }
}
```

### Step 3: Create API Route Handler
**File:** `src/pages/api/dashboard/summary.ts`

```typescript
import type { APIRoute } from 'astro';
import { dashboardQuerySchema } from '../../../lib/validation/dashboard.validation';
import { DashboardService } from '../../../lib/services/dashboard.service';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired authentication token',
          },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const monthParam = url.searchParams.get('month');

    const validationResult = dashboardQuerySchema.safeParse({
      month: monthParam,
    });

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid query parameters',
            details: validationResult.error.flatten().fieldErrors,
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate date range
    const month = validationResult.data.month || getCurrentMonth();
    const { fromDate, toDate } = getMonthDateRange(month);

    // Get dashboard summary
    const dashboardService = new DashboardService(locals.supabase);
    const summary = await dashboardService.getSummary(user.id, fromDate, toDate);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);

    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve dashboard summary',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Helper functions
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMonthDateRange(month: string): { fromDate: string; toDate: string } {
  const [year, monthNum] = month.split('-').map(Number);
  const fromDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
  
  // Calculate last day of month
  const lastDay = new Date(year, monthNum, 0).getDate();
  const toDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  return { fromDate, toDate };
}
```

### Step 4: Testing Checklist

1. **Authentication Tests**
   - [ ] Request without Authorization header returns 401
   - [ ] Request with invalid token returns 401
   - [ ] Request with expired token returns 401
   - [ ] Request with valid token succeeds

2. **Input Validation Tests**
   - [ ] Valid month format (2024-01) succeeds
   - [ ] Invalid month format (2024-13) returns 400
   - [ ] Invalid month format (24-01) returns 400
   - [ ] Invalid month format (2024-1) returns 400
   - [ ] Year out of range (1999-01) returns 400
   - [ ] Year out of range (2100-01) returns 400
   - [ ] Missing month parameter defaults to current month

3. **Data Aggregation Tests**
   - [ ] Empty month returns zero values
   - [ ] Single expense calculates correctly
   - [ ] Multiple expenses aggregate correctly
   - [ ] Category percentages sum to 100%
   - [ ] Uncategorized expenses appear as "Other"
   - [ ] Categories sorted by amount descending

4. **AI Metrics Tests**
   - [ ] AI created count calculated correctly
   - [ ] AI created percentage calculated correctly
   - [ ] AI edited count calculated correctly
   - [ ] AI accuracy percentage calculated correctly
   - [ ] Zero AI expenses handled correctly

5. **Security Tests**
   - [ ] User can only see their own expenses
   - [ ] RLS policies enforced
   - [ ] SQL injection attempts blocked

6. **Performance Tests**
   - [ ] Response time < 500ms for typical dataset
   - [ ] Query uses correct index
   - [ ] Large datasets (1000+ expenses) handled efficiently

### Step 5: Documentation Updates

1. Update API documentation with endpoint details
2. Add example requests and responses
3. Document error codes and messages
4. Update changelog with new endpoint

### Step 6: Deployment Checklist

1. [ ] Code reviewed and approved
2. [ ] All tests passing
3. [ ] Database indexes verified
4. [ ] RLS policies tested
5. [ ] Environment variables configured
6. [ ] Monitoring and logging configured
7. [ ] Performance benchmarks met
8. [ ] Security review completed
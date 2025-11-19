# API Endpoint Implementation Plan: List All Categories

## 1. Endpoint Overview

This endpoint retrieves all predefined expense categories from the database. It serves as a reference data endpoint that should be called when users open the expense form to populate category dropdowns or selectors. The endpoint is designed to be lightweight and cacheable on the client side, as categories are predefined and rarely change.

**Key Characteristics:**
- Read-only operation (no data modification)
- Returns complete list of categories (no pagination needed)
- Requires authentication but no specific authorization (all authenticated users can access)
- Suitable for client-side caching to minimize API calls

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/categories`
- **Parameters**:
  - **Required**: None (query parameters)
  - **Optional**: None
- **Headers**:
  - **Required**: `Authorization: Bearer {access_token}`
- **Request Body**: None (GET request)

## 3. Used Types

### Response DTOs

From [`src/types.ts`](src/types.ts:42):
```typescript
/**
 * Category DTO - represents a single category in API responses
 */
export type CategoryDTO = Pick<Category, 'id' | 'name'>;

/**
 * Category List DTO - response for listing all categories
 */
export type CategoryListDTO = {
  data: CategoryDTO[];
  count: number;
};
```

### Error Response

From [`src/types.ts`](src/types.ts:248):
```typescript
/**
 * API Error Response - standardized error response format
 */
export type APIErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

### No Command Models Required
This is a read-only endpoint with no input validation beyond authentication.

## 4. Response Details

### Success Response (200 OK)
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Groceries"
    },
    {
      "id": "uuid",
      "name": "Transport"
    }
  ],
  "count": 2
}
```

**Response Structure:**
- `data`: Array of [`CategoryDTO`](src/types.ts:46) objects
- `count`: Total number of categories returned

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
- Invalid Bearer token format
- Expired JWT token
- Token verification failure

#### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred while fetching categories"
  }
}
```

**Triggers:**
- Database connection failures
- Unexpected exceptions in service layer
- Supabase client errors

## 5. Data Flow

```
1. Client Request
   ↓
2. Astro API Route (/api/categories.ts)
   ↓
3. Middleware (context.locals.supabase)
   ↓ [Authentication Check]
4. Category Service (getAllCategories)
   ↓
5. Supabase Database Query
   ↓ [SELECT id, name FROM categories]
6. Transform to CategoryListDTO
   ↓
7. Return Response (200 OK)
```

### Detailed Flow:

1. **Client sends GET request** with Authorization header
2. **Astro middleware** ([`src/middleware/index.ts`](src/middleware/index.ts)) injects Supabase client into `context.locals`
3. **API route handler** extracts Supabase client from context
4. **Authentication verification** happens automatically via Supabase client (JWT validation)
5. **Service layer** ([`src/lib/services/category.service.ts`](src/lib/services/category.service.ts)) queries database
6. **Database query** fetches all categories with only `id` and `name` fields
7. **Data transformation** converts database entities to [`CategoryDTO`](src/types.ts:46) format
8. **Response construction** wraps data in [`CategoryListDTO`](src/types.ts:52) structure
9. **Return JSON response** with appropriate status code

### Database Interaction:

From [`supabase/migrations/20251019211337_create_categories_table.sql`](supabase/migrations/20251019211337_create_categories_table.sql):
- Table: `categories`
- Columns queried: `id` (uuid), `name` (text)
- No RLS policies needed (public reference data)
- No filtering or sorting required (return all)

## 6. Security Considerations

### Authentication
- **Requirement**: Valid JWT token in Authorization header
- **Validation**: Handled automatically by Supabase client
- **Token Format**: `Bearer {access_token}`
- **Failure Response**: 401 Unauthorized

### Authorization
- **Access Level**: Any authenticated user
- **Rationale**: Categories are public reference data needed by all users
- **No RLS Required**: Categories table doesn't contain user-specific data

### Data Exposure
- **Public Data**: Categories are predefined and non-sensitive
- **No PII**: No personally identifiable information exposed
- **No User Data**: No user-specific information in response

### Security Best Practices
1. **Token Validation**: Always verify token before database access
2. **Error Messages**: Don't expose internal system details in error responses
3. **Rate Limiting**: Consider implementing on client side through caching
4. **HTTPS Only**: Ensure all API calls use HTTPS in production

### Potential Threats & Mitigations

| Threat | Mitigation |
|--------|-----------|
| Unauthorized access | JWT token validation via Supabase |
| Token theft | Short-lived tokens, HTTPS only |
| Excessive API calls | Client-side caching recommendation |
| SQL injection | Parameterized queries via Supabase client |

## 7. Error Handling

### Error Scenarios & Responses

| Scenario | Status Code | Error Code | Message |
|----------|-------------|------------|---------|
| Missing Authorization header | 401 | UNAUTHORIZED | Invalid or expired authentication token |
| Invalid token format | 401 | UNAUTHORIZED | Invalid or expired authentication token |
| Expired JWT token | 401 | UNAUTHORIZED | Invalid or expired authentication token |
| Database connection failure | 500 | INTERNAL_SERVER_ERROR | An unexpected error occurred while fetching categories |
| Supabase client error | 500 | INTERNAL_SERVER_ERROR | An unexpected error occurred while fetching categories |
| Unexpected exception | 500 | INTERNAL_SERVER_ERROR | An unexpected error occurred while fetching categories |

### Error Handling Strategy

1. **Early Return Pattern**: Check authentication first, return 401 immediately if invalid
2. **Try-Catch Blocks**: Wrap database operations in try-catch for graceful error handling
3. **Consistent Format**: All errors follow [`APIErrorResponse`](src/types.ts:248) structure
4. **Logging**: Log errors to console for debugging (development) and monitoring (production)
5. **User-Friendly Messages**: Don't expose internal implementation details
6. **No Stack Traces**: Never return stack traces in production responses

### Example Error Handling Code Pattern:
```typescript
try {
  const categories = await getAllCategories(supabase);
  return new Response(JSON.stringify(categories), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
} catch (error) {
  console.error('Error fetching categories:', error);
  return new Response(JSON.stringify({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred while fetching categories'
    }
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## 8. Performance Considerations

### Database Performance
- **Query Simplicity**: Simple SELECT with no JOINs or complex conditions
- **Expected Dataset Size**: Small (typically 5-15 categories)
- **No Pagination Needed**: Dataset is small enough to return in full
- **Index**: Primary key index on `id` (automatic)
- **Query Time**: Expected < 10ms

### API Performance
- **Response Size**: Minimal (typically < 1KB)
- **No Heavy Computation**: Simple data retrieval and transformation
- **Expected Response Time**: < 100ms total

### Caching Strategy
- **Client-Side Caching**: Strongly recommended
- **Cache Duration**: Long-lived (categories rarely change)
- **Cache Invalidation**: Manual or on app update
- **Storage Options**: React state, localStorage, or IndexedDB

### Optimization Recommendations
1. **Select Only Required Fields**: Query only `id` and `name` (not `created_at`)
2. **Client Caching**: Implement as per API specification usage note
3. **Conditional Requests**: Consider ETag support for future optimization
4. **CDN Caching**: Not applicable (requires authentication)

### Bottleneck Analysis
- **No Expected Bottlenecks**: Simple query on small dataset
- **Scalability**: Linear with number of categories (which is bounded)
- **Concurrent Requests**: Database can handle high concurrency for simple SELECTs

## 9. Implementation Steps

### Step 1: Create Category Service
**File**: [`src/lib/services/category.service.ts`](src/lib/services/category.service.ts)

```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type { CategoryListDTO } from '../../types';

/**
 * Fetches all categories from the database
 * @param supabase - Supabase client instance
 * @returns CategoryListDTO with all categories and count
 */
export async function getAllCategories(
  supabase: SupabaseClient
): Promise<CategoryListDTO> {
  // Query database for all categories, selecting only required fields
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  // Return in CategoryListDTO format
  return {
    data: data || [],
    count: data?.length || 0,
  };
}
```

**Key Points:**
- Import types from [`src/types.ts`](src/types.ts)
- Use [`SupabaseClient`](src/db/supabase.client.ts:8) type from project
- Select only `id` and `name` fields
- Order by name alphabetically for consistent UI
- Handle null data case (return empty array)
- Throw errors to be caught by route handler

### Step 2: Create API Route Handler
**File**: `src/pages/api/categories.ts`

```typescript
import type { APIRoute } from 'astro';
import { getAllCategories } from '../../lib/services/category.service';
import type { APIErrorResponse } from '../../types';

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Extract Supabase client from context (injected by middleware)
    const supabase = locals.supabase;

    // Verify authentication by checking user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse: APIErrorResponse = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired authentication token',
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch categories from service layer
    const categories = await getAllCategories(supabase);

    // Return success response
    return new Response(JSON.stringify(categories), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log error for debugging
    console.error('Error fetching categories:', error);

    // Return generic error response
    const errorResponse: APIErrorResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while fetching categories',
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Disable prerendering for API routes
export const prerender = false;
```

**Key Points:**
- Use uppercase `GET` for endpoint handler (per [@astro.mdc](d:\Source\paragoniusz\.roo\rules-code\astro.mdc:7))
- Set `prerender = false` for API routes (per [@astro.mdc](d:\Source\paragoniusz\.roo\rules-code\astro.mdc:8))
- Extract Supabase from [`context.locals`](src/middleware/index.ts:7) (per [@backend.mdc](d:\Source\paragoniusz\.roo\rules-code\backend.mdc:9))
- Verify authentication before processing
- Use try-catch for error handling
- Return consistent [`APIErrorResponse`](src/types.ts:248) format
- Set proper Content-Type headers

### Step 3: Test Authentication
**Manual Testing Steps:**

1. **Test without token:**
   ```bash
   curl -X GET http://localhost:4321/api/categories
   ```
   Expected: 401 Unauthorized

2. **Test with invalid token:**
   ```bash
   curl -X GET http://localhost:4321/api/categories \
     -H "Authorization: Bearer invalid_token"
   ```
   Expected: 401 Unauthorized

3. **Test with valid token:**
   ```bash
   curl -X GET http://localhost:4321/api/categories \
     -H "Authorization: Bearer {valid_token}"
   ```
   Expected: 200 OK with category list

### Step 4: Test Database Integration
**Verification Steps:**

1. Ensure categories exist in database (check migrations)
2. Test with empty categories table (should return empty array)
3. Test with populated categories table
4. Verify response format matches [`CategoryListDTO`](src/types.ts:52)
5. Verify `count` matches array length

### Step 5: Integration Testing
**Test Scenarios:**

1. **Happy Path**: Authenticated user receives all categories
2. **Empty Database**: Returns empty array with count 0
3. **Multiple Categories**: Returns all categories sorted by name
4. **Concurrent Requests**: Multiple users can fetch simultaneously
5. **Token Expiry**: Expired token returns 401

### Step 6: Frontend Integration
**Usage Example:**

```typescript
// Fetch categories on component mount
const fetchCategories = async () => {
  const response = await fetch('/api/categories', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (response.ok) {
    const data: CategoryListDTO = await response.json();
    // Cache in React state or localStorage
    setCategories(data.data);
  }
};
```

### Step 7: Documentation
**Update Documentation:**

1. Add endpoint to API documentation
2. Document caching recommendations
3. Add usage examples for frontend developers
4. Document error codes and handling

### Step 8: Monitoring & Logging
**Production Considerations:**

1. Add structured logging for errors
2. Monitor response times
3. Track authentication failures
4. Set up alerts for high error rates
5. Monitor database query performance

## 10. Testing Checklist

- [ ] Service layer unit tests
- [ ] API route integration tests
- [ ] Authentication tests (valid/invalid/missing tokens)
- [ ] Error handling tests (database errors, unexpected exceptions)
- [ ] Response format validation
- [ ] Empty database scenario
- [ ] Performance testing (response time < 100ms)
- [ ] Concurrent request handling
- [ ] Frontend integration testing

## 11. Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Categories seeded in database
- [ ] HTTPS enforced in production
- [ ] Error logging configured
- [ ] Monitoring dashboards set up
- [ ] API documentation updated
- [ ] Frontend caching implemented
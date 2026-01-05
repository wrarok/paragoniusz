# API Endpoint Implementation Plan: Get Current User Profile

## 1. Endpoint Overview

This endpoint retrieves the authenticated user's profile information from the database. It serves as a fundamental endpoint for accessing user-specific application data, particularly the AI consent status which is critical for the receipt scanning feature.

**Key Characteristics:**

- Read-only operation (GET)
- Requires authentication
- Returns user's own profile only (enforced by RLS)
- Simple, fast query with primary key lookup

## 2. Request Details

### HTTP Method

`GET`

### URL Structure

`/api/profiles/me`

### Headers

- **Required:**
  - `Authorization: Bearer {access_token}` - JWT token from Supabase authentication

### Parameters

- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:** None (GET request)

### Authentication Flow

1. Client includes JWT token in Authorization header
2. Astro middleware (`src/middleware/index.ts`) provides Supabase client via `context.locals.supabase`
3. Endpoint extracts user from authenticated session
4. RLS policies automatically filter data to authenticated user

## 3. Used Types

### Response DTO

```typescript
// From src/types.ts
export type ProfileDTO = Profile;

// Where Profile is:
export type Profile = Tables<"profiles">;

// Actual structure:
{
  id: string; // uuid
  ai_consent_given: boolean;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}
```

### Error Response

```typescript
// From src/types.ts
export type APIErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ai_consent_given": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Error Responses

#### 401 Unauthorized

Returned when authentication fails or token is invalid.

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

Returned when the authenticated user doesn't have a profile record.

```json
{
  "error": {
    "code": "PROFILE_NOT_FOUND",
    "message": "Profile not found for the authenticated user"
  }
}
```

**Triggers:**

- User authenticated but profile record doesn't exist in database
- Profile was deleted but user session still active

#### 500 Internal Server Error

Returned for unexpected server-side errors.

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "details": {
      "timestamp": "2024-01-01T00:00:00Z"
    }
  }
}
```

**Triggers:**

- Database connection failures
- Unexpected Supabase errors
- Unhandled exceptions

## 5. Data Flow

```
1. Client Request
   ↓
   [Authorization: Bearer {token}]
   ↓
2. Astro Middleware (src/middleware/index.ts)
   ↓
   [Provides context.locals.supabase]
   ↓
3. API Route Handler (src/pages/api/profiles/me.ts)
   ↓
   [Validates authentication]
   ↓
4. Profile Service (src/lib/services/profile.service.ts)
   ↓
   [Queries database with RLS]
   ↓
5. Supabase Database
   ↓
   [RLS Policy: auth.uid() = id]
   ↓
6. Response
   ↓
   [200 OK with ProfileDTO or error]
```

### Detailed Flow Steps:

1. **Request Reception**: Astro receives GET request to `/api/profiles/me`
2. **Middleware Processing**: Supabase client attached to `context.locals`
3. **Authentication Check**: Extract user from `supabase.auth.getUser()`
4. **Service Call**: Invoke `ProfileService.getProfile(userId)`
5. **Database Query**: Execute SELECT on profiles table
6. **RLS Enforcement**: PostgreSQL automatically filters by `auth.uid() = id`
7. **Result Processing**: Transform database result to ProfileDTO
8. **Response**: Return JSON with appropriate status code

## 6. Security Considerations

### Authentication

- **JWT Validation**: Supabase SDK automatically validates token signature, expiration, and issuer
- **Token Extraction**: Must extract token from Authorization header (format: `Bearer {token}`)
- **Session Verification**: Use `supabase.auth.getUser()` to verify active session

### Authorization

- **RLS Enforcement**: Database-level security ensures users can only access their own profile
- **Policy**: `Allow individual read access` - `auth.uid() = id`
- **No Additional Checks Needed**: RLS handles all authorization logic

### Data Protection

- **Minimal Exposure**: Only return profile data, no sensitive auth information
- **No PII Leakage**: Profile contains only application-specific flags
- **Secure Transport**: HTTPS enforced in production

### Potential Threats & Mitigations

| Threat              | Mitigation                                     |
| ------------------- | ---------------------------------------------- |
| Token theft         | Short-lived tokens, HTTPS only, secure storage |
| Unauthorized access | RLS policies, JWT validation                   |
| Profile enumeration | RLS prevents access to other users' profiles   |
| Token replay        | Token expiration, refresh token rotation       |
| SQL injection       | Parameterized queries via Supabase SDK         |

## 7. Error Handling

### Error Handling Strategy

1. **Authentication Errors** (401)
   - Check for Authorization header presence
   - Validate token format
   - Handle Supabase auth errors
   - Return consistent error structure

2. **Not Found Errors** (404)
   - Check if query returns null
   - Distinguish between "no profile" vs "access denied"
   - Provide clear error message

3. **Server Errors** (500)
   - Catch unexpected exceptions
   - Log error details for debugging
   - Return generic message to client
   - Include timestamp for correlation

### Error Response Format

All errors follow the `APIErrorResponse` type:

```typescript
{
  error: {
    code: string;        // Machine-readable error code
    message: string;     // Human-readable message
    details?: object;    // Optional additional context
  }
}
```

### Error Codes

| Code                | HTTP Status | Description                       |
| ------------------- | ----------- | --------------------------------- |
| `UNAUTHORIZED`      | 401         | Missing or invalid authentication |
| `PROFILE_NOT_FOUND` | 404         | Profile doesn't exist for user    |
| `INTERNAL_ERROR`    | 500         | Unexpected server error           |

## 8. Performance Considerations

### Expected Performance

- **Query Complexity**: O(1) - Primary key lookup
- **Response Time**: < 100ms typical
- **Database Load**: Minimal - single row SELECT

### Optimization Strategies

- **Caching**: Consider caching profile data in client session
- **Connection Pooling**: Supabase handles automatically
- **Index Usage**: Primary key index ensures fast lookup

### Potential Bottlenecks

- **Network Latency**: Client to server distance
- **Cold Start**: First request may be slower (serverless)
- **Database Connection**: Supabase connection pool limits

### Monitoring Recommendations

- Track response times (p50, p95, p99)
- Monitor 401 error rates (potential auth issues)
- Monitor 404 error rates (profile creation issues)
- Alert on 500 errors

## 9. Implementation Steps

### Step 1: Create Profile Service

**File**: `src/lib/services/profile.service.ts`

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { Database } from "../../db/database.types";
import type { ProfileDTO } from "../../types";

export class ProfileService {
  constructor(private supabase: SupabaseClient) {}

  async getProfile(userId: string): Promise<ProfileDTO | null> {
    const { data, error } = await this.supabase.from("profiles").select("*").eq("id", userId).single();

    if (error) {
      throw error;
    }

    return data;
  }
}
```

**Key Points:**

- Accept SupabaseClient in constructor for dependency injection
- Use `.single()` to expect exactly one row
- Let RLS handle authorization
- Throw errors for caller to handle

### Step 2: Create API Route Handler

**File**: `src/pages/api/profiles/me.ts`

```typescript
import type { APIRoute } from "astro";
import { ProfileService } from "../../../lib/services/profile.service";
import type { ProfileDTO, APIErrorResponse } from "../../../types";

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        } satisfies APIErrorResponse),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get profile using service
    const profileService = new ProfileService(locals.supabase);
    const profile = await profileService.getProfile(user.id);

    if (!profile) {
      return new Response(
        JSON.stringify({
          error: {
            code: "PROFILE_NOT_FOUND",
            message: "Profile not found for the authenticated user",
          },
        } satisfies APIErrorResponse),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return profile
    return new Response(JSON.stringify(profile satisfies ProfileDTO), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      } satisfies APIErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const prerender = false;
```

**Key Points:**

- Use uppercase `GET` for handler name (Astro convention)
- Set `prerender = false` for API routes
- Extract user from `locals.supabase.auth.getUser()`
- Use service layer for business logic
- Return consistent error format
- Use `satisfies` for type checking
- Log errors for debugging

### Step 3: Verify Middleware Configuration

**File**: `src/middleware/index.ts` (should already exist)

Ensure middleware is properly configured:

```typescript
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client";

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});
```

**Verification:**

- Middleware attaches Supabase client to context
- Available as `locals.supabase` in route handlers

### Step 4: Verify Type Definitions

**File**: `src/env.d.ts` (should already exist)

Ensure types are properly defined:

```typescript
/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
    }
  }
}
```

**Verification:**

- `locals.supabase` is properly typed
- TypeScript recognizes Database types

### Step 5: Test Authentication Flow

**Manual Testing:**

1. Obtain valid JWT token from Supabase auth
2. Make GET request with Authorization header
3. Verify 200 response with profile data
4. Test without token (expect 401)
5. Test with invalid token (expect 401)
6. Test with user that has no profile (expect 404)

**cURL Example:**

```bash
curl -X GET http://localhost:4321/api/profiles/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 6: Verify RLS Policies

**Database Verification:**

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- Verify policy exists
SELECT * FROM pg_policies
WHERE tablename = 'profiles'
AND policyname = 'Allow individual read access';
```

**Expected Results:**

- `rowsecurity` should be `true`
- Policy should exist with check: `auth.uid() = id`

### Step 7: Integration Testing

**Test Scenarios:**

1. **Happy Path**: Authenticated user gets their profile
2. **No Auth**: Request without token returns 401
3. **Invalid Token**: Malformed token returns 401
4. **Expired Token**: Old token returns 401
5. **No Profile**: User without profile returns 404
6. **Cross-User Access**: RLS prevents accessing other profiles

### Step 8: Documentation

**Update API Documentation:**

- Add endpoint to API reference
- Document request/response formats
- Include example requests
- Document error codes

**Code Comments:**

- Add JSDoc comments to service methods
- Document error handling strategy
- Explain RLS reliance

### Step 9: Monitoring Setup

**Metrics to Track:**

- Request count
- Response times (p50, p95, p99)
- Error rates by status code
- Authentication failure rate

**Logging:**

- Log all 500 errors with stack traces
- Consider logging 404s for profile creation issues
- Don't log 401s (expected for invalid tokens)

### Step 10: Production Checklist

- [ ] Service layer implemented and tested
- [ ] API route handler implemented
- [ ] Error handling covers all scenarios
- [ ] Types properly defined and used
- [ ] RLS policies verified in database
- [ ] Manual testing completed
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Monitoring configured
- [ ] Code reviewed and approved

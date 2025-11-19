# API Endpoint Implementation Plan: Update User Profile

## 1. Endpoint Overview

This endpoint allows authenticated users to update their profile settings, specifically the AI consent flag (`ai_consent_given`). The endpoint is designed to be extensible for future profile updates while currently focusing on the AI consent feature required for receipt processing functionality.

**Purpose**: Enable users to grant or revoke consent for AI processing of their receipts.

**Key Features**:
- Updates only the `ai_consent_given` field
- Automatically updates the `updated_at` timestamp
- Protected by Row Level Security (RLS)
- Returns the complete updated profile

## 2. Request Details

- **HTTP Method**: `PATCH`
- **URL Structure**: `/api/profiles/me`
- **Authentication**: Required (Bearer token in Authorization header)

### Headers
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

### Request Body
```json
{
  "ai_consent_given": true
}
```

### Parameters
- **Required**:
  - `ai_consent_given` (boolean): User's consent status for AI processing
  
- **Optional**: None

### Validation Rules
- `ai_consent_given` must be a boolean value (true or false)
- No additional fields are allowed in the request body
- Request body cannot be empty

## 3. Used Types

### Input DTO
```typescript
// Zod schema for validation
const UpdateProfileSchema = z.object({
  ai_consent_given: z.boolean({
    required_error: "ai_consent_given is required",
    invalid_type_error: "ai_consent_given must be a boolean"
  })
}).strict(); // Prevents additional properties

type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
```

### Command Model (for service layer)
```typescript
interface UpdateProfileCommand {
  userId: string;
  ai_consent_given: boolean;
}
```

### Response DTO
```typescript
interface ProfileResponseDto {
  id: string;
  ai_consent_given: boolean;
  created_at: string; // ISO 8601 format
  updated_at: string; // ISO 8601 format
}
```

### Database Type (from database.types.ts)
```typescript
// Should already exist in database.types.ts
interface Profile {
  id: string;
  ai_consent_given: boolean;
  created_at: string;
  updated_at: string;
}
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ai_consent_given": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Invalid request payload",
  "details": [
    {
      "field": "ai_consent_given",
      "message": "ai_consent_given must be a boolean"
    }
  ]
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

#### 404 Not Found
```json
{
  "error": "Profile not found",
  "message": "User profile does not exist"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## 5. Data Flow

```
1. Client Request
   ↓
2. Astro Middleware (index.ts)
   - Attaches supabase client to context.locals
   ↓
3. API Route Handler (/api/profiles/me.ts)
   - Validates HTTP method (PATCH)
   - Extracts Authorization header
   - Validates JWT token with Supabase
   - Extracts user ID from token
   ↓
4. Request Validation
   - Parse request body
   - Validate with Zod schema
   - Check for extra fields
   ↓
5. Service Layer (profile.service.ts)
   - Call updateProfile(supabase, userId, data)
   - Execute UPDATE query on profiles table
   - RLS policy ensures user can only update their own profile
   ↓
6. Database (Supabase)
   - Update profiles table
   - Set ai_consent_given = new value
   - Automatically update updated_at timestamp
   - Return updated row
   ↓
7. Response Formatting
   - Map database result to ProfileResponseDto
   - Return 200 OK with updated profile
   ↓
8. Client receives response
```

### Database Query
```sql
UPDATE profiles
SET 
  ai_consent_given = $1,
  updated_at = now()
WHERE id = $2
RETURNING id, ai_consent_given, created_at, updated_at;
```

## 6. Security Considerations

### Authentication
- **Token Validation**: Verify JWT token using Supabase's `auth.getUser()` method
- **Token Extraction**: Parse Bearer token from Authorization header
- **Session Validation**: Ensure token is not expired and user session is active

### Authorization
- **RLS Policies**: Database-level security ensures users can only update their own profile
  - Policy: `auth.uid() = id` on UPDATE operations
- **User ID Verification**: Extract user ID from authenticated token, not from request body

### Data Validation
- **Input Sanitization**: Zod schema validates data types and structure
- **Strict Schema**: `.strict()` prevents mass assignment vulnerabilities
- **Type Safety**: TypeScript ensures type correctness throughout the flow

### Additional Security Measures
- **No Sensitive Data Exposure**: Response only includes necessary profile fields
- **CORS**: Handled by Astro configuration
- **Rate Limiting**: Consider implementing rate limiting for production (not in scope)

## 7. Error Handling

### Error Scenarios and Responses

| Scenario | Status Code | Error Message | Handling Strategy |
|----------|-------------|---------------|-------------------|
| Missing Authorization header | 401 | "Authorization header is required" | Check header existence before processing |
| Invalid token format | 401 | "Invalid token format" | Validate Bearer token structure |
| Expired/invalid token | 401 | "Invalid or expired token" | Use Supabase auth.getUser() error |
| Missing request body | 400 | "Request body is required" | Check body existence |
| Invalid JSON | 400 | "Invalid JSON in request body" | Wrap JSON.parse in try-catch |
| Invalid ai_consent_given type | 400 | "ai_consent_given must be a boolean" | Zod validation error |
| Missing ai_consent_given field | 400 | "ai_consent_given is required" | Zod validation error |
| Extra fields in request | 400 | "Unknown field: {fieldName}" | Zod strict mode error |
| Profile not found | 404 | "Profile not found" | Check if update returns null |
| Database connection error | 500 | "Database error occurred" | Log error, return generic message |
| Unexpected server error | 500 | "An unexpected error occurred" | Log error with stack trace |

### Error Response Format
All errors should follow a consistent structure:
```typescript
interface ErrorResponse {
  error: string;        // Error type/category
  message: string;      // Human-readable message
  details?: unknown;    // Optional validation details
}
```

### Logging Strategy
- **Client Errors (4xx)**: Log at INFO level with request details
- **Server Errors (5xx)**: Log at ERROR level with full stack trace
- **Security Events**: Log authentication failures for monitoring

## 8. Performance Considerations

### Database Performance
- **Indexed Queries**: Profile updates use primary key (id), which is automatically indexed
- **Single Query**: Update operation is atomic and returns data in one round-trip
- **RLS Overhead**: Minimal - simple equality check on indexed column

### Optimization Strategies
- **Connection Pooling**: Supabase client handles connection pooling automatically
- **Response Size**: Minimal - only 4 fields returned
- **No N+1 Queries**: Single update query with RETURNING clause

### Potential Bottlenecks
- **Authentication**: Token validation requires Supabase API call
  - Mitigation: Supabase handles this efficiently with caching
- **Network Latency**: External Supabase calls
  - Mitigation: Use appropriate timeout values

### Scalability Notes
- Endpoint is stateless and horizontally scalable
- Database writes are lightweight (single boolean update)
- No complex joins or aggregations

## 9. Implementation Steps

### Step 1: Update Type Definitions (src/types.ts)
Add the following type definitions:
```typescript
// Request/Response DTOs
export interface UpdateProfileDto {
  ai_consent_given: boolean;
}

export interface ProfileResponseDto {
  id: string;
  ai_consent_given: boolean;
  created_at: string;
  updated_at: string;
}

// Service layer command
export interface UpdateProfileCommand {
  userId: string;
  ai_consent_given: boolean;
}
```

### Step 2: Create Zod Validation Schema
In the API route file, define the validation schema:
```typescript
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  ai_consent_given: z.boolean({
    required_error: "ai_consent_given is required",
    invalid_type_error: "ai_consent_given must be a boolean"
  })
}).strict();
```

### Step 3: Implement Service Method (src/lib/services/profile.service.ts)
Add the `updateProfile` method to the existing profile service:
```typescript
export async function updateProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: UpdateProfileCommand
) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      ai_consent_given: data.ai_consent_given,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select('id, ai_consent_given, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  if (!profile) {
    throw new Error('Profile not found');
  }

  return profile;
}
```

### Step 4: Implement API Route Handler (src/pages/api/profiles/me.ts)
Create the PATCH endpoint handler:

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { updateProfile } from '../../../lib/services/profile.service';
import type { UpdateProfileDto, ProfileResponseDto } from '../../../types';

const UpdateProfileSchema = z.object({
  ai_consent_given: z.boolean({
    required_error: "ai_consent_given is required",
    invalid_type_error: "ai_consent_given must be a boolean"
  })
}).strict();

export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Extract and validate Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authorization header is required'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validate token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await locals.supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid JSON in request body'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = UpdateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request payload',
          details: validationResult.error.errors
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updateData: UpdateProfileDto = validationResult.data;

    // 4. Update profile via service
    const updatedProfile = await updateProfile(
      locals.supabase,
      user.id,
      {
        userId: user.id,
        ai_consent_given: updateData.ai_consent_given
      }
    );

    // 5. Return success response
    const response: ProfileResponseDto = {
      id: updatedProfile.id,
      ai_consent_given: updatedProfile.ai_consent_given,
      created_at: updatedProfile.created_at,
      updated_at: updatedProfile.updated_at
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Handle specific errors
    if (error instanceof Error && error.message === 'Profile not found') {
      return new Response(
        JSON.stringify({
          error: 'Not Found',
          message: 'Profile not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log unexpected errors
    console.error('Error updating profile:', error);

    // Return generic error response
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Disable prerendering for API routes
export const prerender = false;
```

### Step 5: Testing Checklist

#### Unit Tests (if applicable)
- [ ] Test Zod schema validation with valid input
- [ ] Test Zod schema validation with invalid types
- [ ] Test Zod schema validation with missing fields
- [ ] Test Zod schema validation with extra fields
- [ ] Test service method with valid data
- [ ] Test service method with non-existent user

#### Integration Tests
- [ ] Test successful profile update with valid token
- [ ] Test with missing Authorization header
- [ ] Test with invalid token format
- [ ] Test with expired token
- [ ] Test with invalid JSON body
- [ ] Test with missing ai_consent_given field
- [ ] Test with non-boolean ai_consent_given value
- [ ] Test with extra fields in request body
- [ ] Test that updated_at timestamp is updated
- [ ] Test RLS policy enforcement (user can only update own profile)

#### Manual Testing
- [ ] Test with Postman/Thunder Client
- [ ] Verify response format matches specification
- [ ] Check database to confirm update
- [ ] Test with different boolean values (true/false)
- [ ] Verify error messages are user-friendly

### Step 6: Documentation
- [ ] Add JSDoc comments to service method
- [ ] Document API endpoint in API documentation
- [ ] Add example requests/responses to documentation
- [ ] Update CHANGELOG if applicable

## 10. Additional Notes

### Future Enhancements
- Consider adding support for updating additional profile fields
- Implement audit logging for consent changes (compliance requirement)
- Add webhook notifications for consent changes
- Consider implementing optimistic locking with version field

### Compliance Considerations
- AI consent changes may need to be logged for GDPR compliance
- Consider adding a consent history table in future iterations
- Ensure consent timestamp is accurately recorded

### Related Endpoints
- GET `/api/profiles/me` - Retrieve current user profile
- This endpoint should be implemented consistently with the GET endpoint

### Dependencies
- `@supabase/supabase-js` - Database client
- `zod` - Input validation
- Astro middleware for Supabase client injection
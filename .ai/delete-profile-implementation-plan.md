# API Endpoint Implementation Plan: Delete User Account

## 1. Endpoint Overview

This endpoint permanently deletes the authenticated user's account and all associated data from the system. The deletion is irreversible and includes the user's profile, all expenses, and authentication records. The database CASCADE constraints ensure complete data removal.

**Key Characteristics:**
- Destructive operation (permanent deletion)
- Requires authentication
- No request body or parameters
- Returns empty response on success
- Leverages database CASCADE for related data cleanup

## 2. Request Details

- **HTTP Method**: DELETE
- **URL Structure**: `/api/profiles/me`
- **Authentication**: Required (Bearer token in Authorization header)
- **Parameters**:
  - **Required**: None (user ID derived from JWT token)
  - **Optional**: None
- **Request Body**: None (DELETE requests typically have no body)
- **Headers**:
  - `Authorization: Bearer {access_token}` (required)

## 3. Used Types

No specific DTOs or Command Models are needed for this endpoint as it:
- Has no request body
- Returns empty response (204 No Content)
- Uses only the authenticated user's ID from the JWT token

## 4. Response Details

### Success Response (204 No Content)
```typescript
// Empty response body
// Status: 204 No Content
```

### Error Responses

#### 401 Unauthorized
```typescript
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Scenarios:**
- Missing Authorization header
- Invalid token format
- Expired token
- Token doesn't correspond to any user

#### 500 Internal Server Error
```typescript
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Failed to delete user account"
  }
}
```

**Scenarios:**
- Database connection failure
- Supabase API error
- Unexpected deletion failure

## 5. Data Flow

```
1. Client sends DELETE request with Authorization header
   ↓
2. Astro middleware extracts Supabase client (context.locals.supabase)
   ↓
3. API route handler verifies authentication
   - Extract user from JWT token via supabase.auth.getUser()
   - If invalid/expired → return 401
   ↓
4. Call ProfileService.deleteProfile(userId)
   ↓
5. Service uses Supabase Admin API to delete auth user
   - Requires service role key (elevated permissions)
   - DELETE from auth.users table
   ↓
6. Database CASCADE automatically triggers:
   - DELETE from profiles table (ON DELETE CASCADE from auth.users)
   - DELETE from expenses table (ON DELETE CASCADE from profiles)
   ↓
7. Return 204 No Content (empty response)
```

**Database Relationships (from db-plan.md):**
- `profiles.id` → `auth.users(id) ON DELETE CASCADE`
- `expenses.user_id` → `profiles(id) ON DELETE CASCADE`

This means deleting from `auth.users` automatically cleans up all related data.

## 6. Security Considerations

### Authentication & Authorization
- **Token Validation**: Must verify JWT token validity before any operation
- **User Verification**: Ensure the token corresponds to an existing user
- **Self-Service Only**: User can only delete their own account (enforced by using authenticated user's ID)
- **Session Invalidation**: After deletion, all user sessions should be invalidated

### Data Privacy & Compliance
- **Complete Deletion**: Ensure all user data is removed (CASCADE handles this)
- **Audit Trail**: Consider logging account deletions for compliance purposes
- **GDPR Compliance**: This endpoint helps fulfill "right to be forgotten" requirements

### Security Threats & Mitigations
1. **Authentication Bypass**
   - Threat: Unauthorized account deletion
   - Mitigation: Strict JWT validation via Supabase

2. **Token Theft**
   - Threat: Stolen token used to delete account
   - Mitigation: Short token expiration, HTTPS only

3. **Accidental Deletion**
   - Threat: User accidentally deletes account
   - Mitigation: Frontend should implement confirmation dialog (not API responsibility)

4. **Service Role Key Exposure**
   - Threat: Admin API key leaked
   - Mitigation: Store in environment variables, never in code

## 7. Error Handling

### Error Scenarios

| Scenario | Status Code | Error Code | Message |
|----------|-------------|------------|---------|
| Missing Authorization header | 401 | UNAUTHORIZED | Authentication required |
| Invalid token format | 401 | UNAUTHORIZED | Invalid authentication token |
| Expired token | 401 | UNAUTHORIZED | Authentication token expired |
| User not found | 401 | UNAUTHORIZED | User not found |
| Database connection failure | 500 | INTERNAL_SERVER_ERROR | Failed to delete user account |
| Supabase API error | 500 | INTERNAL_SERVER_ERROR | Failed to delete user account |
| Unexpected error | 500 | INTERNAL_SERVER_ERROR | An unexpected error occurred |

### Error Handling Strategy
1. **Early Return Pattern**: Check authentication first, return 401 immediately if invalid
2. **Generic Error Messages**: Don't expose internal details in 500 errors
3. **Logging**: Log all errors server-side for debugging
4. **Graceful Degradation**: If deletion fails, ensure no partial state

## 8. Performance Considerations

### Potential Bottlenecks
1. **Database CASCADE Operations**: Deleting a user with many expenses could take time
2. **Supabase Admin API Call**: Network latency to Supabase servers
3. **Multiple Table Operations**: CASCADE triggers multiple DELETE operations

### Optimization Strategies
1. **Database Indexes**: Ensure foreign key columns are indexed (already done per db-plan.md)
2. **Connection Pooling**: Supabase handles this automatically
3. **Async Operations**: Use async/await properly to avoid blocking
4. **Timeout Handling**: Set reasonable timeout for deletion operation

### Expected Performance
- **Typical Response Time**: < 500ms for users with moderate data
- **Worst Case**: 1-2 seconds for users with thousands of expenses
- **Database Load**: Minimal due to CASCADE efficiency

## 9. Implementation Steps

### Step 1: Update ProfileService
**File**: `src/lib/services/profile.service.ts`

Add a new method to handle user deletion:

```typescript
/**
 * Permanently deletes a user account and all associated data
 * @param userId - The UUID of the user to delete
 * @throws Error if deletion fails
 */
async deleteProfile(userId: string): Promise<void> {
  // Use Supabase Admin API to delete the auth user
  // This requires the service role key with elevated permissions
  const { error } = await this.supabase.auth.admin.deleteUser(userId);
  
  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
  
  // CASCADE will automatically delete:
  // - Profile record (profiles.id → auth.users.id)
  // - All expenses (expenses.user_id → profiles.id)
}
```

**Note**: The service needs access to Supabase Admin API, which requires the service role key. This should be configured in the service constructor or passed as a parameter.

### Step 2: Add DELETE Handler to API Route
**File**: `src/pages/api/profiles/me.ts`

Add the DELETE method handler to the existing file:

```typescript
export async function DELETE(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;
  
  // Step 1: Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Step 2: Delete the user account
  try {
    const profileService = new ProfileService(supabase);
    await profileService.deleteProfile(user.id);
    
    // Step 3: Return 204 No Content
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete user account:', error);
    
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete user account'
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

### Step 3: Configure Supabase Admin Access
**File**: `.env` (local) and deployment environment

Ensure the service role key is available:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Update `src/db/supabase.client.ts` to export an admin client:

```typescript
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient<Database>(
  supabaseUrl, 
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

### Step 4: Update ProfileService Constructor
**File**: `src/lib/services/profile.service.ts`

Modify the service to accept both regular and admin clients:

```typescript
import { supabaseAdmin } from '../db/supabase.client';

export class ProfileService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private adminClient: SupabaseClient<Database> = supabaseAdmin
  ) {}
  
  // Use this.adminClient for deleteProfile method
}
```

### Step 5: Add Prerender Configuration
**File**: `src/pages/api/profiles/me.ts`

Ensure the route is not prerendered:

```typescript
export const prerender = false;
```

### Step 6: Testing Checklist

**Manual Testing:**
1. ✅ Delete account with valid token → 204 No Content
2. ✅ Verify profile is deleted from database
3. ✅ Verify all expenses are deleted (CASCADE)
4. ✅ Verify auth user is deleted
5. ✅ Attempt to use deleted user's token → 401
6. ✅ Delete without Authorization header → 401
7. ✅ Delete with invalid token → 401
8. ✅ Delete with expired token → 401

**Database Verification:**
```sql
-- Before deletion
SELECT COUNT(*) FROM auth.users WHERE id = 'user_id';
SELECT COUNT(*) FROM profiles WHERE id = 'user_id';
SELECT COUNT(*) FROM expenses WHERE user_id = 'user_id';

-- After deletion (all should return 0)
SELECT COUNT(*) FROM auth.users WHERE id = 'user_id';
SELECT COUNT(*) FROM profiles WHERE id = 'user_id';
SELECT COUNT(*) FROM expenses WHERE user_id = 'user_id';
```

### Step 7: Documentation Updates

Update API documentation to include:
- Endpoint description
- Authentication requirements
- Warning about permanent deletion
- Success and error responses
- Example curl command

```bash
curl -X DELETE https://api.example.com/api/profiles/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 10. Additional Considerations

### Frontend Integration
The frontend should:
1. Show a confirmation dialog before calling this endpoint
2. Explain that deletion is permanent and irreversible
3. Require the user to type "DELETE" or similar confirmation
4. Log the user out immediately after successful deletion
5. Redirect to a "Account Deleted" confirmation page

### Compliance & Legal
- Consider implementing a "soft delete" with a grace period for account recovery
- Log deletion events for audit purposes (GDPR compliance)
- Ensure deletion happens within required timeframes (e.g., 30 days for GDPR)

### Future Enhancements
1. **Soft Delete**: Add `deleted_at` timestamp instead of immediate deletion
2. **Account Recovery**: Allow users to restore account within grace period
3. **Data Export**: Offer data export before deletion (GDPR requirement)
4. **Deletion Confirmation Email**: Send email confirming account deletion
5. **Rate Limiting**: Prevent abuse of deletion endpoint
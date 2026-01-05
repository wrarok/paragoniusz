# E2E Test Teardown Documentation

## Overview

The E2E test teardown process ensures that all test data is properly cleaned up from the Supabase database after test runs complete. This prevents test data accumulation and ensures a clean state for subsequent test runs.

## Implementation

### Global Teardown

The teardown is implemented in [`globalTeardown.ts`](mdc:e2e/globalTeardown.ts:1) which runs once after all E2E tests complete.

### Cleanup Process

The cleanup process is handled by the [`cleanupTestUsers()`](mdc:e2e/helpers/auth.helpers.ts:447) function in [`auth.helpers.ts`](mdc:e2e/helpers/auth.helpers.ts:1), which:

1. **Lists ALL users** from Supabase Auth (not just those tracked in `createdTestUsers` Set)
2. **Filters** for users matching the test email pattern: `test-{timestamp}{random}@test.pl`
3. **Excludes** whitelisted production users (test@test.com, test-b@test.com, wra@acme.com)
4. For each matching test user, calls [`deleteTestUser()`](mdc:e2e/helpers/auth.helpers.ts:380) which:
   - **Step 1**: Deletes database records in correct order (respecting foreign keys):
     - Deletes from [`expenses`](mdc:src/db/database.types.ts:55) table (references `profiles.id`)
     - Deletes from [`profiles`](mdc:src/db/database.types.ts:109) table
   - **Step 2**: Deletes the user from Supabase Auth

**Important**: This approach ensures cleanup works even for users created directly through the UI (e.g., in `user-onboarding.spec.ts`), not just those created via the [`registerUser()`](mdc:e2e/helpers/auth.helpers.ts:141) helper function.

### Safety Features

The teardown includes multiple safety checks:

1. **Whitelist Protection**: Production users (defined in `PRODUCTION_USERS_WHITELIST`) are never deleted
2. **Pattern Matching**: Only emails matching the test pattern (`test-{timestamp}{random}@test.pl`) are deleted
3. **Error Handling**: Errors during cleanup don't fail the test suite - they're logged for review

### Environment Variables

The teardown uses the following environment variables from `.env.test`:

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations (preferred)
- `SUPABASE_ANON_KEY`: Fallback if service role key is not available

**Note**: The `SUPABASE_SERVICE_ROLE_KEY` is required for proper cleanup as it provides admin-level access to delete users and bypass Row Level Security (RLS) policies.

## Database Schema

### Tables Cleaned

Based on [`database.types.ts`](mdc:src/db/database.types.ts:1):

#### 1. expenses

- **Primary Key**: `id` (string)
- **Foreign Keys**:
  - `user_id` → `profiles.id`
  - `category_id` → `categories.id`
- **Deletion**: All expenses for the test user are deleted first

#### 2. profiles

- **Primary Key**: `id` (string)
- **No Foreign Keys**: Can be deleted after expenses
- **Deletion**: Profile is deleted after all expenses are removed

#### 3. users (Auth)

- **Location**: Supabase Auth (not a database table)
- **Deletion**: Deleted last, after all database records are cleaned

### Deletion Order

The deletion order is critical due to foreign key constraints:

```
1. expenses (references profiles.id)
   ↓
2. profiles (no dependencies)
   ↓
3. auth.users (handled by Supabase Auth API)
```

## Usage

### Automatic Cleanup

Cleanup runs automatically after all tests via Playwright's global teardown configuration in [`playwright.config.ts`](mdc:playwright.config.ts:1):

```typescript
export default defineConfig({
  globalTeardown: "./e2e/globalTeardown.ts",
  // ... other config
});
```

### Manual Cleanup

You can manually trigger cleanup for specific users:

```typescript
import { deleteTestUser } from "./e2e/helpers/auth.helpers";

// Delete a specific test user
await deleteTestUser("test-1234567890abc@test.pl");
```

## Troubleshooting

### Cleanup Failures

If cleanup fails, check:

1. **Service Role Key**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.test`
2. **RLS Policies**: Service role key bypasses RLS, but if using anon key, ensure policies allow deletion
3. **Foreign Key Constraints**: The deletion order must be maintained (expenses → profiles → auth)
4. **Network Issues**: Check Supabase connection and API availability

### Viewing Cleanup Logs

Cleanup progress is logged to the console:

```
============================================================
🧹 Running Global Teardown
============================================================

🧹 Cleaning up 3 test users...
  ✅ Deleted expenses for test-1234567890abc@test.pl
  ✅ Deleted profile for test-1234567890abc@test.pl
  ✅ Deleted auth user: test-1234567890abc@test.pl
  ...
✅ Test user cleanup complete

✅ Global teardown completed successfully
```

### Orphaned Test Data

If test data remains after cleanup:

1. Check if the test user was added to `createdTestUsers` Set
2. Verify the email matches the test pattern
3. Ensure the service role key has proper permissions
4. Manually delete using Supabase dashboard or SQL

## Related Files

- [`e2e/globalTeardown.ts`](mdc:e2e/globalTeardown.ts:1) - Global teardown entry point
- [`e2e/helpers/auth.helpers.ts`](mdc:e2e/helpers/auth.helpers.ts:1) - Cleanup implementation
- [`src/db/database.types.ts`](mdc:src/db/database.types.ts:1) - Database schema types
- [`playwright.config.ts`](mdc:playwright.config.ts:1) - Playwright configuration

## Best Practices

1. **Always use the helper functions**: Use [`registerUser()`](mdc:e2e/helpers/auth.helpers.ts:141) from auth.helpers.ts to ensure users are tracked
2. **Don't disable teardown**: Keep global teardown enabled to prevent data accumulation
3. **Monitor cleanup logs**: Review cleanup logs after test runs to catch issues early
4. **Use service role key**: Always configure `SUPABASE_SERVICE_ROLE_KEY` for reliable cleanup
5. **Test pattern compliance**: Ensure test emails follow the pattern `test-{timestamp}{random}@test.pl`

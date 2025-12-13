# Integration Tests - Database Layer

This directory contains integration tests for the database layer of Paragoniusz application.

## Prerequisites

### 1. Test User Setup

You need to manually create **TWO** test users in Supabase Auth:

#### User A (Primary Test User)
- Email: `test@test.com`
- Password: `TestPassword123!`
- Required in `.env.test` as `E2E_USERNAME` and `E2E_PASSWORD`

#### User B (For RLS Isolation Tests)
- Email: `test-b@test.com`
- Password: `TestPassword123!`
- Used only in RLS tests to verify data isolation

**How to create test users:**
1. Go to your Supabase project dashboard
2. Navigate to Authentication → Users
3. Click "Add user" → "Create new user"
4. Enter email and password
5. After creation, copy the user's UUID
6. Update `.env.test` with `E2E_USERNAME_ID` (for User A)
7. Update `test/helpers/test-auth.ts` with `TEST_USER_B.id` (for User B)

### 2. Environment Configuration

Create `.env.test` in project root:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_PUBLIC_KEY=your_supabase_anon_key
E2E_USERNAME=test@test.com
E2E_PASSWORD=TestPassword123!
E2E_USERNAME_ID=actual-uuid-from-supabase
```

### 3. Database Setup

Ensure all migrations are applied:
```bash
npx supabase db push
```

Required categories must exist (seeded via migrations):
- żywność, transport, media, rozrywka, zdrowie, edukacja, odzież, restauracje, mieszkanie, ubezpieczenia, higiena, prezenty, podróże, subskrypcje, inne

## Test Structure

```
test/integration/
├── README.md (this file)
├── database/
│   ├── smoke.test.ts           # Setup verification (6 tests)
│   ├── rls-policies.test.ts    # RLS isolation tests (~15 tests)
│   ├── constraints.test.ts     # Database constraints (~25 tests)
│   └── triggers.test.ts        # Auto-update triggers (~12 tests)
└── helpers/ (in test/helpers/)
    ├── test-auth.ts            # Auth helper functions
    └── test-database.ts        # Database helper functions
```

## Running Tests

### Run all integration tests
```bash
npm run test:integration
```

### Run in watch mode
```bash
npm run test:integration:watch
```

### Run with UI
```bash
npm run test:integration:ui
```

### Run specific test file
```bash
npm run test:integration -- rls-policies
```

### Run with coverage
```bash
npm run test:integration:coverage
```

## Test Suites

### 1. Smoke Tests (`smoke.test.ts`)
Verifies basic setup and configuration.

**Tests:**
- Environment variables loaded
- Database connection works
- Test user exists and can authenticate
- Categories are properly seeded

**Run first to verify setup!**

### 2. RLS Policies Tests (`rls-policies.test.ts`)
Tests Row Level Security policies for data isolation.

**Coverage:**
- SELECT policy: User A cannot read User B's expenses
- INSERT policy: User A cannot create expenses for User B
- UPDATE policy: User A cannot modify User B's expenses
- DELETE policy: User A cannot delete User B's expenses
- Multi-user scenarios

**Expected behavior:**
- Each user sees ONLY their own data
- Attempts to access other users' data fail silently (return empty/null)
- Attempts to modify user_id fail with RLS error

### 3. Constraints Tests (`constraints.test.ts`)
Tests database-level constraints and validation.

**Coverage:**
- `expenses_amount_positive`: Rejects zero/negative amounts
- `expenses_date_not_future`: Rejects future dates
- `numeric(10,2)`: Validates precision and max value (99,999,999.99)
- Foreign key: Rejects invalid category_id

**Expected behavior:**
- Valid data passes all constraints
- Invalid data throws PostgreSQL errors
- Constraints are enforced at database level (cannot be bypassed)

### 4. Triggers Tests (`triggers.test.ts`)
Tests automatic database behaviors.

**Coverage:**
- `set_updated_at` trigger: Auto-updates timestamp on modifications
- Timestamp consistency: `created_at` vs `updated_at`
- CASCADE DELETE: Expenses deleted when user deleted (documented, not fully tested)

**Expected behavior:**
- `updated_at` changes on every UPDATE
- `created_at` never changes after insert
- Timestamps have sub-second precision

## Troubleshooting

### "Failed to authenticate test user"
- Verify user exists in Supabase Auth
- Check email/password in `.env.test`
- Ensure `E2E_USERNAME_ID` matches actual user UUID

### "Missing required categories"
- Run migrations: `npx supabase db push`
- Check migration: `20251129123300_update_categories_to_polish.sql`

### "RLS tests failing"
- User B might not exist - create manually
- Update `TEST_USER_B.id` in `test/helpers/test-auth.ts`
- Check RLS policies are enabled: `supabase/migrations/20251202214300_enable_expenses_rls.sql`

### "Constraint tests failing"
- Check PostgreSQL version (constraints may behave differently)
- Verify migration applied: `20251019211400_create_expenses_table.sql`

### Tests are flaky
- Increase timeout in `vitest.integration.config.ts`
- Check network connection to Supabase
- Verify database isn't under heavy load

## Safety Features

### Data Isolation
- Tests use dedicated test users (`test@test.com`, `test-b@test.com`)
- `cleanTestData()` only deletes data for `TEST_USER.id`
- RLS protects against accidental deletion of other users' data

### Production Safety
- Tests connect to production database BUT:
  - Only test users' data is affected
  - RLS prevents cross-user contamination
  - Cleanup runs after each test
  - For production deployment, migrate to local Supabase

## Next Steps

After database integration tests:
1. **FAZA 3:** API Integration Tests (CRUD operations)
2. **FAZA 4:** Receipt Processing Integration
3. **FAZA 5:** End-to-End Tests (Playwright)

## Maintenance

### Adding New Tests
1. Create test file in `test/integration/database/`
2. Use helpers from `test/helpers/`
3. Add cleanup in `afterEach`
4. Update this README

### Updating Test Users
If test user credentials change:
1. Update `.env.test`
2. Update `TEST_USER_B` in `test/helpers/test-auth.ts`
3. Rerun smoke tests to verify

## References

- [Master Test Plan](.ai/MASTER_TEST_PLAN.md) - Line 380+
- [Vitest Docs](https://vitest.dev/)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
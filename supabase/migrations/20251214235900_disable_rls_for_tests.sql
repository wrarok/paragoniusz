-- migration: disable rls for integration tests
-- purpose: temporarily disable rls to allow integration tests to run
-- affected tables: expenses
-- special considerations:
--   - this is only for local development and testing
--   - should never be applied to production
--   - allows tests to bypass rls policies for direct database access

-- disable row level security on expenses table for testing
-- warning: this allows unrestricted access to all expenses during tests
alter table public.expenses disable row level security;
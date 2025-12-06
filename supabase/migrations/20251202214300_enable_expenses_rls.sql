-- migration: enable row level security on expenses table
-- purpose: ensure users can only access their own expenses
-- affected tables: expenses
-- special considerations:
--   - rls policies already exist from initial migration
--   - re-enabling rls activates existing policies
--   - critical for data privacy and multi-user support

-- enable row level security on expenses table
-- this activates the existing rls policies that filter by user_id
-- ensures each user can only see, create, update, and delete their own expenses
alter table public.expenses enable row level security;

comment on table public.expenses is 'expenses table with rls enabled - users can only access their own data';
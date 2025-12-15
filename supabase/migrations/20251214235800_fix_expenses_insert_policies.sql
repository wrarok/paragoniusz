-- migration: fix expenses insert policies
-- purpose: recreate insert policies with proper with check conditions
-- affected tables: expenses
-- special considerations:
--   - drops and recreates insert policies to fix missing with check conditions
--   - ensures users can only insert expenses with their own user_id

-- drop existing insert policies that have broken with check conditions
drop policy if exists "allow individual insert access for authenticated users" on public.expenses;
drop policy if exists "allow individual insert access for anonymous users" on public.expenses;

-- recreate insert policies with proper with check conditions
-- rls policy: allow authenticated users to insert their own expenses
-- rationale: users should be able to create new expense records
-- with check ensures user_id matches authenticated user
create policy "allow individual insert access for authenticated users"
  on public.expenses
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- rls policy: allow anonymous users to insert their own expenses
-- rationale: supports scenarios where expenses might be created during signup flow
create policy "allow individual insert access for anonymous users"
  on public.expenses
  for insert
  to anon
  with check (auth.uid() = user_id);
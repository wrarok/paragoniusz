-- migration: create expenses table
-- purpose: main transactional table storing all user expenses
-- affected tables: expenses
-- special considerations:
--   - foreign keys to profiles and categories with appropriate cascade behavior
--   - numeric type for amount to avoid floating-point errors
--   - composite index for optimized dashboard queries
--   - ai tracking columns for metrics (prd 6.2, 6.3)
--   - comprehensive rls policies for all crud operations

-- create expenses table
-- stores all user expense transactions with categorization and ai tracking
create table public.expenses (
  -- primary key using uuid for consistency
  id uuid primary key default gen_random_uuid(),
  
  -- foreign key to profiles with cascade delete
  -- when a user is deleted, all their expenses are automatically removed
  user_id uuid not null references public.profiles(id) on delete cascade,
  
  -- foreign key to categories
  -- no cascade delete - if a category is removed, expenses should be preserved
  category_id uuid not null references public.categories(id),
  
  -- monetary value using numeric to avoid floating-point precision issues
  -- numeric(10, 2) supports values up to 99,999,999.99
  amount numeric(10, 2) not null,
  
  -- date the expense was incurred (not when it was recorded)
  expense_date date not null default current_date,
  
  -- currency code for future multi-currency support
  currency text not null default 'PLN',
  
  -- ai feature tracking for metrics
  -- created_by_ai: measures ai feature adoption (prd 6.3)
  created_by_ai boolean not null default false,
  
  -- was_ai_suggestion_edited: measures ai accuracy (prd 6.2)
  -- true if user modified ai-suggested expense details
  was_ai_suggestion_edited boolean not null default false,
  
  -- audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- add comments to table and columns for documentation
comment on table public.expenses is 'main transactional table storing all user expenses with ai tracking';
comment on column public.expenses.user_id is 'foreign key to profiles with cascade delete for data cleanup';
comment on column public.expenses.category_id is 'foreign key to categories for expense classification';
comment on column public.expenses.amount is 'monetary value using numeric to avoid floating-point errors';
comment on column public.expenses.expense_date is 'date expense was incurred (not recorded)';
comment on column public.expenses.currency is 'currency code for future multi-currency support';
comment on column public.expenses.created_by_ai is 'tracks ai feature adoption (prd 6.3)';
comment on column public.expenses.was_ai_suggestion_edited is 'tracks ai accuracy by measuring user edits (prd 6.2)';

-- create composite index for optimized dashboard queries
-- this index significantly speeds up fetching user's recent expenses (prd 3.2)
-- user_id for filtering by user, expense_date desc for chronological sorting
create index expenses_user_id_expense_date_idx 
  on public.expenses (user_id, expense_date desc);

comment on index expenses_user_id_expense_date_idx is 'optimizes dashboard queries for user expenses sorted by date (prd 3.2)';

-- enable row level security
-- rls is required to ensure users can only access their own expenses
alter table public.expenses enable row level security;

-- rls policy: allow authenticated users to read their own expenses
-- rationale: users should only see their own expense data
create policy "allow individual read access for authenticated users"
  on public.expenses
  for select
  to authenticated
  using (auth.uid() = user_id);

-- rls policy: allow anonymous users to read their own expenses
-- rationale: supports scenarios where expenses might be viewed during signup flow
create policy "allow individual read access for anonymous users"
  on public.expenses
  for select
  to anon
  using (auth.uid() = user_id);

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

-- rls policy: allow authenticated users to update their own expenses
-- rationale: users should be able to modify their expense records
-- using clause ensures user can only update their own expenses
-- with check ensures user_id cannot be changed to another user
create policy "allow individual update access for authenticated users"
  on public.expenses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- rls policy: allow anonymous users to update their own expenses
-- rationale: supports scenarios where expenses might be updated during signup flow
create policy "allow individual update access for anonymous users"
  on public.expenses
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- rls policy: allow authenticated users to delete their own expenses
-- rationale: users should be able to remove their expense records
create policy "allow individual delete access for authenticated users"
  on public.expenses
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- rls policy: allow anonymous users to delete their own expenses
-- rationale: supports scenarios where expenses might be deleted during signup flow
create policy "allow individual delete access for anonymous users"
  on public.expenses
  for delete
  to anon
  using (auth.uid() = user_id);

-- create trigger to automatically update updated_at on expense changes
-- reuses the handle_updated_at function created in profiles migration
create trigger set_updated_at
  before update on public.expenses
  for each row
  execute function public.handle_updated_at();

-- add constraint to ensure amount is positive
-- expenses should always have a positive monetary value
alter table public.expenses
  add constraint expenses_amount_positive check (amount > 0);

-- add constraint to ensure expense_date is not in the future
-- prevents data entry errors where future dates are accidentally entered
alter table public.expenses
  add constraint expenses_date_not_future check (expense_date <= current_date);
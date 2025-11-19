-- migration: create categories table
-- purpose: dictionary table for predefined expense categories
-- affected tables: categories
-- special considerations:
--   - publicly readable for all users
--   - unique constraint on category names
--   - seeded with common expense categories

-- create categories table
-- stores predefined expense categories for classification
create table public.categories (
  -- primary key using uuid for consistency
  id uuid primary key default gen_random_uuid(),
  
  -- category name must be unique to prevent duplicates
  name text not null unique,
  
  -- audit timestamp
  created_at timestamptz not null default now()
);

-- add comment to table for documentation
comment on table public.categories is 'dictionary table for predefined expense categories';
comment on column public.categories.name is 'unique category name (e.g., groceries, transport)';

-- enable row level security
-- rls is required even for public tables to enforce access control
alter table public.categories enable row level security;

-- rls policy: allow authenticated users to read all categories
-- rationale: all users need to see available categories when creating expenses
create policy "allow read access for authenticated users"
  on public.categories
  for select
  to authenticated
  using (true);

-- rls policy: allow anonymous users to read all categories
-- rationale: categories may need to be displayed before authentication
create policy "allow read access for anonymous users"
  on public.categories
  for select
  to anon
  using (true);

-- seed categories table with common expense categories
-- these categories cover typical personal expense tracking needs
insert into public.categories (name) values
  ('groceries'),
  ('transport'),
  ('utilities'),
  ('entertainment'),
  ('healthcare'),
  ('education'),
  ('clothing'),
  ('dining'),
  ('housing'),
  ('insurance'),
  ('personal care'),
  ('gifts'),
  ('travel'),
  ('subscriptions'),
  ('other');

-- seed data has been added above with 15 common expense categories
-- migration: disable row level security
-- purpose: disable rls on profiles, categories, and expenses tables
-- affected tables: profiles, categories, expenses
-- special considerations:
--   - this is a destructive operation that removes all access control
--   - disabling rls allows unrestricted access to all rows in these tables
--   - use with caution in production environments

-- disable row level security on profiles table
-- warning: this allows unrestricted access to all user profiles
alter table public.profiles disable row level security;

-- disable row level security on categories table
-- warning: this allows unrestricted access to all categories
alter table public.categories disable row level security;

-- disable row level security on expenses table
-- warning: this allows unrestricted access to all user expenses
alter table public.expenses disable row level security;
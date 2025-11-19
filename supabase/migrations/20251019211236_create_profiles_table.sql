-- migration: create profiles table
-- purpose: extends auth.users with application-specific user data
-- affected tables: profiles
-- special considerations: 
--   - one-to-one relationship with auth.users
--   - cascading delete ensures data cleanup when user is deleted
--   - tracks ai consent for receipt processing feature

-- create profiles table
-- stores user-specific application data extending supabase auth.users
create table public.profiles (
  -- primary key references auth.users for one-to-one relationship
  id uuid primary key references auth.users(id) on delete cascade,
  
  -- tracks if user has consented to ai processing of receipts (prd 3.4)
  ai_consent_given boolean not null default false,
  
  -- audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- add comment to table for documentation
comment on table public.profiles is 'user profiles extending auth.users with application-specific data';
comment on column public.profiles.id is 'one-to-one relationship with auth.users';
comment on column public.profiles.ai_consent_given is 'tracks user consent for ai receipt processing (prd 3.4)';

-- enable row level security
-- rls is required even for user-specific data to enforce access control
alter table public.profiles enable row level security;

-- rls policy: allow authenticated users to read their own profile
-- rationale: users should only access their own profile data
create policy "allow individual read access for authenticated users"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- rls policy: allow anonymous users to read their own profile
-- rationale: supports scenarios where profile data might be accessed during signup flow
create policy "allow individual read access for anonymous users"
  on public.profiles
  for select
  to anon
  using (auth.uid() = id);

-- rls policy: allow authenticated users to update their own profile
-- rationale: users should be able to modify their own settings (e.g., ai_consent_given)
create policy "allow individual update access for authenticated users"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- rls policy: allow anonymous users to update their own profile
-- rationale: supports scenarios where profile updates might occur during signup flow
create policy "allow individual update access for anonymous users"
  on public.profiles
  for update
  to anon
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- create function to automatically update updated_at timestamp
-- this ensures updated_at is always current when profile is modified
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- create trigger to automatically update updated_at on profile changes
create trigger set_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- create function to automatically create profile when user signs up
-- this ensures every auth.users record has a corresponding profiles record
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- create trigger on auth.users to auto-create profile
-- security definer allows the function to bypass rls when creating the profile
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
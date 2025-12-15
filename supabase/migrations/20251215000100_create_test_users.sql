-- migration: create test users for integration tests
-- purpose: ensure test users exist for integration testing
-- affected tables: auth.users, public.profiles
-- special considerations:
--   - creates users directly in auth.users table
--   - creates corresponding profiles
--   - uses fixed UUIDs for predictable testing

-- create test user A (main test user)
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role
) values (
  '36f6805a-07b3-42e0-b7fa-afea8d5f06c0',
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  crypt('aaAA22@@', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated'
) on conflict (id) do nothing;

-- create profile for test user A
insert into public.profiles (
  id,
  ai_consent_given
) values (
  '36f6805a-07b3-42e0-b7fa-afea8d5f06c0',
  false
) on conflict (id) do nothing;

-- create test user B (for RLS isolation tests)
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role
) values (
  'af2a7269-f170-497e-8c13-5a484d926671',
  '00000000-0000-0000-0000-000000000000',
  'test-b@test.com',
  crypt('aaAA22@@', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated'
) on conflict (id) do nothing;

-- create profile for test user B
insert into public.profiles (
  id,
  ai_consent_given
) values (
  'af2a7269-f170-497e-8c13-5a484d926671',
  false
) on conflict (id) do nothing;

-- comment on table auth.users is 'test users created for integration testing';
-- note: cannot add comment to auth.users table due to permissions
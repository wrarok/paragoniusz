-- migration: seed default user profile for development
-- purpose: creates a default user profile for testing without authentication
-- affected tables: profiles
-- special considerations: 
--   - this is for development/testing purposes only
--   - uses the DEFAULT_USER_ID from src/db/supabase.client.ts
--   - ai_consent_given is set to true for testing ai features

-- insert default user profile for development
-- this allows testing endpoints without setting up full authentication
insert into public.profiles (id, ai_consent_given)
values ('a33573a0-3562-495e-b3c4-d898d0b54241', true)
on conflict (id) do update
  set ai_consent_given = excluded.ai_consent_given;

-- add comment explaining this is for development
comment on table public.profiles is 'user profiles extending auth.users with application-specific data. includes default test user for development.';
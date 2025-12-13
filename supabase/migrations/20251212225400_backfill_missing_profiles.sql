-- migration: backfill missing profiles
-- purpose: create profiles for any auth.users that don't have a corresponding profile
-- affected tables: profiles
-- special considerations: idempotent operation - safe to run multiple times

-- insert profiles for any users that don't have one yet
-- this handles users created before the profile trigger was set up
insert into public.profiles (id, ai_consent_given)
select 
  au.id,
  false as ai_consent_given
from auth.users au
left join public.profiles p on au.id = p.id
where p.id is null;

-- log how many profiles were created
do $$
declare
  profile_count integer;
begin
  select count(*) into profile_count
  from public.profiles;
  
  raise notice 'Total profiles in database: %', profile_count;
end $$;
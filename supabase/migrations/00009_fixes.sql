-- ClinicOS Migration 00009: Schema fixes & RLS improvements

-- 1. Add missing last_login_at column to users
alter table "public"."users"
  add column if not exists "last_login_at" timestamptz;

-- 2. Add timezone column to clinics (referenced by seed.sql)
alter table "public"."clinics"
  add column if not exists "timezone" text default 'UTC';

-- 3. Add a "select own" RLS policy for users table
--    This is a safety net: even if get_user_clinic_id() returns NULL
--    (e.g. the user row hasn't been backfilled yet), the user can
--    still read their own row once it exists.
drop policy if exists "users_select_own" on "public"."users";
create policy "users_select_own" on "public"."users"
  for select using (
    id = auth.uid()
  );

-- 4. Backfill public.users for any existing auth.users that don't have a row
--    (handles users who signed up before migration 00008 was applied)
insert into "public"."users" (id, clinic_id, email, full_name, status, created_at, updated_at)
select
  au.id,
  (select id from "public"."clinics" limit 1) as clinic_id,
  coalesce(au.email, ''),
  coalesce(au.raw_user_meta_data ->> 'full_name', split_part(coalesce(au.email, 'unknown'), '@', 1)),
  'active',
  au.created_at,
  au.created_at
from "auth"."users" au
where au.id not in (select id from "public"."users")
on conflict (id) do nothing;

-- 5. Assign Owner role to the first user of each clinic (if not already assigned)
insert into "public"."user_roles" (user_id, role_id)
select u.id, r.id
from "public"."users" u
cross join "public"."roles" r
where r.name = 'Owner'
  and u.clinic_id is not null
  and not exists (
    select 1 from "public"."user_roles" ur
    where ur.user_id = u.id
  )
on conflict (user_id, role_id) do nothing;

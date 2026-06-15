-- ClinicOS Migration 00008: Auth User Auto-Provisioning
-- Automatically creates a public.users row when a new auth.users signup happens.
-- Requires at least one clinic to exist in the clinics table first.

create or replace function "public"."handle_new_user"()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic_id uuid;
begin
  -- Pick the first clinic. The admin must create one before users can sign up.
  select id into v_clinic_id from public.clinics limit 1;

  if v_clinic_id is null then
    raise exception 'No clinic found. Create a clinic before signing up users.';
  end if;

  insert into public.users (id, clinic_id, email, full_name, phone, avatar_url, status)
  values (
    new.id,
    v_clinic_id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'unknown'), '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'avatar_url',
    'active'
  )
  on conflict (id) do nothing;

  -- Assign the Owner role to the first user of each clinic
  insert into public.user_roles (user_id, role_id)
  select new.id, r.id
  from public.roles r
  where r.name = 'Owner'
    and not exists (
      select 1 from public.user_roles ur
      join public.users u on u.id = ur.user_id
      where u.clinic_id = v_clinic_id
    )
  on conflict (user_id, role_id) do nothing;

  return new;
end;
$$;

create or replace trigger "on_auth_user_created"
  after insert on "auth"."users"
  for each row
  execute function "public"."handle_new_user"();

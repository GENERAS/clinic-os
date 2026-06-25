-- Migration 00037: Create SECURITY DEFINER RPCs for user context loading
-- Bypasses RLS for auth provider data fetching (same pattern as 00036)

-- Returns full user profile + clinic + roles + permissions in one call
create or replace function public.get_user_context()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_data jsonb;
  v_clinic_data jsonb;
  v_roles jsonb;
  v_permissions text[];
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  -- 1. Get user data
  select jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'full_name', u.full_name,
    'phone', u.phone,
    'avatar_url', u.avatar_url,
    'clinic_id', u.clinic_id,
    'status', u.status,
    'is_super_admin', u.is_super_admin,
    'last_login_at', u.last_login_at,
    'created_at', u.created_at
  ) into v_user_data
  from public.users u
  where u.id = v_user_id;

  if v_user_data is null then
    return jsonb_build_object('error', 'User not found');
  end if;

  -- 2. Get clinic data (nullable)
  if (v_user_data->>'clinic_id') is not null then
    select jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'slug', c.slug,
      'phone', c.phone,
      'email', c.email,
      'address', c.address,
      'logo_url', c.logo_url,
      'status', c.status,
      'timezone', c.timezone,
      'onboarding_completed', c.onboarding_completed,
      'created_at', c.created_at
    ) into v_clinic_data
    from public.clinics c
    where c.id = (v_user_data->>'clinic_id')::uuid;
  end if;

  -- 3. Get roles with names
  select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name))
  into v_roles
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = v_user_id;

  -- 4. Get distinct permission names across all roles
  select array_agg(distinct p.name order by p.name)
  into v_permissions
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  join public.permissions p on p.id = rp.permission_id
  where ur.user_id = v_user_id;

  -- 5. Return combined result
  return jsonb_build_object(
    'user_data', v_user_data,
    'clinic_data', v_clinic_data,
    'roles', coalesce(v_roles, '[]'::jsonb),
    'permissions', coalesce(v_permissions, array[]::text[])
  );
end;
$$;

-- Simple RPC to update last_login_at (used on SIGNED_IN event)
create or replace function public.update_last_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is not null then
    update public.users set last_login_at = now() where id = v_user_id;
  end if;
end;
$$;

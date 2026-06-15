-- ClinicOS Migration 00013: Super admin role & audit trail
-- Adds is_super_admin flag, sets generaskagiraneza@gmail.com as super admin,
-- and adds permissive RLS bypass policies so super admin can see all data.

-- 1. Add is_super_admin column to users
alter table "public"."users"
  add column if not exists "is_super_admin" boolean not null default false;

-- 2. Set generaskagiraneza@gmail.com as super admin
update "public"."users"
set "is_super_admin" = true
where "email" = 'generaskagiraneza@gmail.com';

-- 3. Add super admin bypass policies on every data table
-- These allow users with is_super_admin = true to bypass clinic-scoped filtering.
-- PostgreSQL combines multiple PERMISSIVE policies with OR, so adding these
-- alongside the existing clinic-scoped policies gives super admins full access
-- while regular users remain scoped to their clinic.

do $$
declare
  tables_with_clinic_id text[] := array[
    'appointments', 'patients', 'inventory_items', 'inventory_categories',
    'inventory_transactions', 'staff_invitations', 'clinic_operating_hours',
    'audit_logs', 'notifications', 'clinic_preferences',
    'clinic_notification_settings', 'patient_notes',
    'whatsapp_credentials', 'whatsapp_messages', 'whatsapp_templates'
  ];
  t text;
begin
  foreach t in array tables_with_clinic_id
  loop
    execute format(
      'create policy "super_admin_all_%1$s" on public.%1$s
        for all to authenticated
        using (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true))
        with check (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true))',
      t
    );
  end loop;
end $$;

-- Tables without clinic_id but need super admin access
create policy "super_admin_all_clinics" on public.clinics
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true))
  with check (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true));

create policy "super_admin_all_users" on public.users
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true))
  with check (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true));

create policy "super_admin_all_user_roles" on public.user_roles
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true))
  with check (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true));

create policy "super_admin_all_roles" on public.roles
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true))
  with check (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true));

create policy "super_admin_all_permissions" on public.permissions
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true))
  with check (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true));

create policy "super_admin_all_role_permissions" on public.role_permissions
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true))
  with check (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true));

create policy "super_admin_all_appointment_notes" on public.appointment_notes
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true))
  with check (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true));

create policy "super_admin_all_appointment_status_history" on public.appointment_status_history
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true))
  with check (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true));

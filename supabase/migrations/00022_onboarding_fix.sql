-- =============================================================
-- 00022_onboarding_fix.sql
-- Adds missing INSERT policies for onboarding flow.
-- The clinics table had only SELECT policies, preventing
-- client-side clinic creation during onboarding.
-- =============================================================

-- 1. INSERT policy for clinics (needed by onboarding ClinicSnapshotStep)
drop policy if exists "clinics_insert_own" on "public"."clinics";
create policy "clinics_insert_own" on "public"."clinics"
  for insert with check (
    -- Any authenticated user can create a clinic
    auth.role() = 'authenticated'
  );

-- 2. INSERT policy for user_roles (dropped by 00012 but never recreated)
drop policy if exists "user_roles_insert_own" on "public"."user_roles";
create policy "user_roles_insert_own" on "public"."user_roles"
  for insert with check (
    -- Users can insert their own role assignments
    user_id = auth.uid()
  );

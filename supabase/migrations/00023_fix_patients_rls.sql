-- =============================================================
-- 00023_fix_patients_rls.sql
-- Fixes 403 Forbidden on patient INSERT/SELECT during onboarding.
--
-- Root cause: users_update_same_clinic has a WITH CHECK that
-- self-references get_user_clinic_id(). When ClinicSnapshotStep
-- updates the user's clinic_id (line 151 in onboarding/page.jsx):
--
--   await supabase.from("users").update({ clinic_id: clinicId })
--                     .eq("id", user.id);
--
-- ...the WITH CHECK evaluates:
--     new_clinic_id = get_user_clinic_id()
-- ...but get_user_clinic_id() returns the OLD clinic_id because
-- the UPDATE hasn't committed yet. The check FAILS, the UPDATE
-- is silently rejected, users.clinic_id stays NULL/wrong, and
-- EVERY RLS policy that depends on the subquery
--   (select clinic_id from public.users where id = auth.uid())
-- returns 403.
--
-- Fix: Drop users_update_same_clinic. The policy users_update_own
-- (id = auth.uid()) already allows users to edit their own row.
-- Also recreate patients policies with inline subqueries (in case
-- 00012_rls_fix.sql was not applied).
-- =============================================================

-- 1. Drop the self-referential policy that blocks clinic_id updates
drop policy if exists "users_update_same_clinic" on "public"."users";

-- 2. Recreate patients INSERT policy with inline subquery
drop policy if exists "patients_insert_same_clinic" on "public"."patients";
create policy "patients_insert_same_clinic" on "public"."patients"
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- 3. Recreate patients SELECT policy with inline subquery
drop policy if exists "patients_select_same_clinic" on "public"."patients";
create policy "patients_select_same_clinic" on "public"."patients"
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- 4. Recreate patients UPDATE policy with inline subquery
drop policy if exists "patients_update_same_clinic" on "public"."patients";
create policy "patients_update_same_clinic" on "public"."patients"
  for update using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  ) with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- 5. Recreate patients DELETE policy with inline subquery
drop policy if exists "patients_delete_same_clinic" on "public"."patients";
create policy "patients_delete_same_clinic" on "public"."patients"
  for delete using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- 6. Recreate patient_notes policies with inline subquery
drop policy if exists "patient_notes_select_same_clinic" on "public"."patient_notes";
create policy "patient_notes_select_same_clinic" on "public"."patient_notes"
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

drop policy if exists "patient_notes_insert_same_clinic" on "public"."patient_notes";
create policy "patient_notes_insert_same_clinic" on "public"."patient_notes"
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- Migration 00030: Fix missing super admin RLS policies
-- Super admins couldn't UPDATE users or manage user_roles for other users.

-- Fix 1: Allow super admins to UPDATE any user
DROP POLICY IF EXISTS "users_update_super_admin" ON public.users;
CREATE POLICY "users_update_super_admin"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Fix 2: Allow super admins full CRUD on user_roles
DROP POLICY IF EXISTS "user_roles_super_admin_all" ON public.user_roles;
CREATE POLICY "user_roles_super_admin_all"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Fix 3: Tighten user_roles insert — restrict to own clinic or super admin
DROP POLICY IF EXISTS "user_roles_insert_own" ON public.user_roles;
CREATE POLICY "user_roles_insert_own"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IN (SELECT id FROM public.users WHERE clinic_id = public.current_user_clinic_id())
    OR public.is_super_admin()
  );

-- Schema cache reload
NOTIFY pgrst, 'reload schema';

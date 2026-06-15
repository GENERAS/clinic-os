-- 00016_fix_user_rls_recursion.sql
-- Fixes infinite recursion in RLS policies on the users table.
--
-- Problem:
--   1. users_select_same_clinic had subquery: (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
--      which self-referenced users and triggered PostgreSQL's RLS recursion detection
--   2. super_admin_all_users previously used public.is_super_admin() which queried users table
--      (fine for other tables, but caused recursion when used ON users)
--
-- Fix:
--   1. Create public.get_my_clinic_id() as SECURITY DEFINER (bypasses RLS)
--      so no recursion when users_select_same_clinic evaluates
--   2. super_admin_all_users on users uses JWT claim app_metadata.is_super_admin
--      (zero table queries, zero recursion)

-- Function to safely get current user's clinic_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS 'SELECT clinic_id FROM public.users WHERE id = auth.uid();';

-- Fix users_select_same_clinic — use SECURITY DEFINER function
DROP POLICY IF EXISTS users_select_same_clinic ON public.users;
CREATE POLICY users_select_same_clinic ON public.users
  FOR SELECT TO public
  USING (clinic_id = public.get_my_clinic_id());

-- Ensure super_admin bypass on users uses JWT (no table query)
DROP POLICY IF EXISTS super_admin_all_users ON public.users;
CREATE POLICY super_admin_all_users ON public.users
  FOR ALL TO authenticated
  USING (COALESCE((auth.jwt() ->> 'app_metadata'::text)::json ->> 'is_super_admin', 'false')::boolean);

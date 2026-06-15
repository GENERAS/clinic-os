-- Create a SECURITY DEFINER function to check super admin status without RLS recursion
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT is_super_admin FROM public.users WHERE id = auth.uid();
$$;

-- Drop all existing super_admin_all_* policies
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 'super_admin_all_%' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Recreate them on all existing tables using the non-recursive function
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format(
      'CREATE POLICY super_admin_all_%I ON public.%I FOR ALL TO authenticated USING (public.is_super_admin())',
      tbl, tbl
    );
  END LOOP;
END $$;

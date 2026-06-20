-- Migration 00029: Fix missing grants for admin-facing tables
-- Tables created in 00015/00020 never got service_role grants,
-- breaking super admin pages that query them via the REST API.

-- Fix 1: Grant service_role full access to all tables in the public schema
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Fix 2: Also ensure anon has SELECT on these specific tables
-- (they were missed by the broad grants in 00024/00026)
GRANT SELECT ON public.plans TO anon;
GRANT SELECT ON public.subscriptions TO anon;
GRANT SELECT ON public.invoices TO anon;

-- Fix 3: Ensure authenticated has full access
GRANT ALL ON public.plans TO authenticated;
GRANT ALL ON public.subscriptions TO authenticated;
GRANT ALL ON public.invoices TO authenticated;

-- Schema cache reload
NOTIFY pgrst, 'reload schema';

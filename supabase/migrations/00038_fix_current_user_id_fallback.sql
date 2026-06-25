-- Migration 00038: Fix current_user_id() to fall back to request.jwt.claims
--
-- Root cause: PostgREST sets request.jwt.claims (full JWT JSON payload) but
-- does NOT set request.jwt.claim.sub (individual claim). The built-in auth.uid()
-- has fallback logic: check request.jwt.claim.sub first, then fall back to
-- request.jwt.claims->>'sub'. The current_user_id() helper was missing this
-- fallback, causing it to return NULL in RLS policy context.
--
-- This fix updates current_user_id() to use the same coalesce pattern as auth.uid()
-- so that all RLS policies depending on current_user_id(), current_user_clinic_id(),
-- and current_user_is_super_admin() now resolve correctly.

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT NULLIF(
        COALESCE(
            NULLIF(current_setting('request.jwt.claim.sub', TRUE), ''),
            (NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb ->> 'sub')
        ),
        ''
    )::UUID;
$$;

NOTIFY pgrst, 'reload schema';

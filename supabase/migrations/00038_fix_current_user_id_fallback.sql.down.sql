-- Down migration for 00038: Revert current_user_id() to original single-path lookup
-- This restores the function to its pre-fix state (only request.jwt.claim.sub).
-- Warning: RLS policies will break again in PostgREST context if reapplied.

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT NULLIF(
        NULLIF(current_setting('request.jwt.claim.sub', TRUE), ''),
        ''
    )::UUID;
$$;

NOTIFY pgrst, 'reload schema';

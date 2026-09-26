-- Migration 00052: Drop stale create_patient overload that collides with 00049
--
-- Renumbered from 00050 to 00052: 00050 was already taken by 00050_sms.sql.
-- Supabase keys its migration history by version number, so two files sharing
-- 00050 meant only one could ever be recorded as applied and the CLI applied
-- them in nondeterministic order.
--
-- The live DB had an older 5-arg create_patient(p_clinic_id, p_full_name, p_phone,
-- p_created_by, p_date_of_birth) that conflicts with the 7-arg version created in
-- 00049, causing PostgREST PGRST203 "could not choose the best candidate function".
-- Keep only the 7-arg superset and re-grant EXECUTE.
--
-- Verified 2026-09-27: calling the 7-arg RPC now resolves unambiguously and
-- returns a not-null violation (23502) rather than PGRST203, so the stale
-- overload is already gone on the live database. Both statements below are
-- idempotent and this migration is a safe no-op there; it still matters for
-- environments where the stale overload exists.
DROP FUNCTION IF EXISTS public.create_patient(uuid, text, text, uuid, date);

GRANT EXECUTE ON FUNCTION public.create_patient(uuid, text, text, uuid, date, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_patient(uuid, text, text, uuid, date, text, text) TO authenticated;

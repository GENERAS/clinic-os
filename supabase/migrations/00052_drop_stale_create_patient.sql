-- Migration 00050: Drop stale create_patient overload that collides with 00049
-- The live DB had an older 5-arg create_patient(p_clinic_id, p_full_name, p_phone,
-- p_created_by, p_date_of_birth) that conflicts with the 7-arg version created in
-- 00049, causing PostgREST PGRST203 "could not choose the best candidate function".
-- Keep only the 7-arg superset and re-grant EXECUTE.

DROP FUNCTION IF EXISTS public.create_patient(uuid, text, text, uuid, date);

GRANT EXECUTE ON FUNCTION public.create_patient(uuid, text, text, uuid, date, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_patient(uuid, text, text, uuid, date, text, text) TO authenticated;

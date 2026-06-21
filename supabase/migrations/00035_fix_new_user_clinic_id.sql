-- =============================================================
-- 00035_fix_new_user_clinic_id.sql
-- Fixes handle_new_user trigger: new signups get NULL clinic_id
-- instead of being assigned to the first clinic in the DB.
-- The onboarding flow will set clinic_id when the user creates
-- their own clinic.
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, clinic_id, email, full_name, phone, avatar_url, status)
  VALUES (
    NEW.id,
    NULL,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', SPLIT_PART(COALESCE(NEW.email, 'unknown'), '@', 1)),
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'avatar_url',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

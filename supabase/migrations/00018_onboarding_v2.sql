-- =============================================================
-- 00018_onboarding_v2.sql
-- Adds columns for new 5-step onboarding flow:
--   clinic_type, district (clinics table)
--   onboarding_completed_at, onboarding_step (clinics table)
-- =============================================================

-- 1. Add onboarding columns to clinics
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS clinic_type text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS district text;

-- 2. Update the handle_new_user trigger to support the new signup
--    (without clinic_name — user signs up first, creates clinic later)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clinic_id uuid;
  v_is_onboarding boolean;
BEGIN
  v_is_onboarding := NEW.raw_user_meta_data ? 'clinic_name';

  IF v_is_onboarding THEN
    -- Legacy onboarding: create user without clinic_id
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
  ELSE
    -- New flow: signup creates user without clinic (no clinic_name in metadata)
    -- or existing behavior: assign to first available clinic
    SELECT id INTO v_clinic_id FROM public.clinics ORDER BY created_at ASC LIMIT 1;

    INSERT INTO public.users (id, clinic_id, email, full_name, phone, avatar_url, status)
    VALUES (
      NEW.id,
      v_clinic_id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', SPLIT_PART(COALESCE(NEW.email, 'unknown'), '@', 1)),
      NEW.raw_user_meta_data ->> 'phone',
      NEW.raw_user_meta_data ->> 'avatar_url',
      'active'
    )
    ON CONFLICT (id) DO NOTHING;

    IF v_clinic_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id)
      SELECT NEW.id, r.id
      FROM public.roles r
      WHERE r.name = 'Owner'
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.users u ON u.id = ur.user_id
          WHERE u.clinic_id = v_clinic_id
        )
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

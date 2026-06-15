-- =============================================================
-- 00011_onboarding.sql
-- Self-serve clinic onboarding flow
-- Makes clinic_id nullable during onboarding, adds RPC for
-- atomic clinic+hours+role creation, modifies trigger.
-- =============================================================

-- 1. Make clinic_id nullable (users can exist without a clinic during onboarding)
ALTER TABLE public.users ALTER COLUMN clinic_id DROP NOT NULL;

-- 2. Add onboarding tracking columns to clinics
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS onboarding_step integer;

-- 3. Update the handle_new_user trigger to support onboarding flow
--    If raw_user_meta_data contains 'clinic_name', the user is onboarding
--    and will create their clinic later. Otherwise, existing behavior.
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
    -- Onboarding: create user without clinic_id
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
    -- Existing behavior: assign to first available clinic
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

    -- Assign Owner role to the first user of each clinic
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

-- 4. RPC function: complete_onboarding
--    Called from the browser after the user fills in clinic details + hours.
--    Atomically creates clinic, updates user, inserts hours, assigns Owner role,
--    and sets up default preferences. Runs with SECURITY DEFINER (bypasses RLS).
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_clinic_name text,
  p_clinic_slug text,
  p_clinic_phone text,
  p_clinic_address text,
  p_clinic_timezone text,
  p_operating_hours jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_clinic_id uuid;
  v_owner_role_id uuid;
  v_hours jsonb;
BEGIN
  -- Get the current authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Create the clinic
  INSERT INTO public.clinics (name, slug, phone, address, timezone, onboarding_completed, onboarding_step)
  VALUES (p_clinic_name, p_clinic_slug, p_clinic_phone, p_clinic_address, p_clinic_timezone, false, 1)
  RETURNING id INTO v_clinic_id;

  -- Link the user to the clinic
  UPDATE public.users SET clinic_id = v_clinic_id WHERE id = v_user_id;

  -- Insert operating hours (jsonb array of {day_of_week, open_time, close_time, is_open})
  FOR v_hours IN SELECT * FROM jsonb_array_elements(p_operating_hours)
  LOOP
    INSERT INTO public.clinic_operating_hours (clinic_id, day_of_week, open_time, close_time, is_open)
    VALUES (
      v_clinic_id,
      (v_hours->>'day_of_week')::integer,
      v_hours->>'open_time',
      v_hours->>'close_time',
      COALESCE((v_hours->>'is_open')::boolean, true)
    );
  END LOOP;

  -- Assign Owner role
  SELECT id INTO v_owner_role_id FROM public.roles WHERE name = 'Owner' LIMIT 1;
  IF v_owner_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (v_user_id, v_owner_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  -- Default clinic preferences
  INSERT INTO public.clinic_preferences (clinic_id, default_appointment_duration, default_appointment_buffer)
  VALUES (v_clinic_id, 30, 5)
  ON CONFLICT (clinic_id) DO NOTHING;

  -- Default notification settings
  INSERT INTO public.clinic_notification_settings (clinic_id)
  VALUES (v_clinic_id)
  ON CONFLICT (clinic_id) DO NOTHING;

  -- Mark onboarding complete
  UPDATE public.clinics SET onboarding_completed = true, onboarding_step = 4 WHERE id = v_clinic_id;

  RETURN jsonb_build_object('clinic_id', v_clinic_id);
END;
$$;

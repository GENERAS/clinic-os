-- =============================================================
-- 00021_onboarding_guard.sql
-- Adds onboarding guard for new clinics
-- Existing clinics get onboarding_completed = true to avoid
-- breaking current users. New clinics default to false and
-- must complete the onboarding wizard.
-- =============================================================

-- Ensure onboarding_completed column exists (in case 00011 wasn't applied)
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Mark ALL existing clinics as completed to avoid breaking current users
UPDATE public.clinics SET onboarding_completed = true WHERE onboarding_completed = false;

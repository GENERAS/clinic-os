-- Migration 00047: Add procedure_name to consultations + fix various schema mismatches

-- 1. Add procedure_name column to consultations (used by procedures module)
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS procedure_name TEXT;

-- 2. Add provider column to insurance_pre_authorizations if missing
-- (already exists in 00039, but ensure it's there)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_pre_authorizations' AND column_name = 'provider'
    ) THEN
        ALTER TABLE public.insurance_pre_authorizations ADD COLUMN provider TEXT NOT NULL DEFAULT 'Unknown';
    END IF;
END $$;

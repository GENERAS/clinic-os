-- Migration 00025: Triage Records & Lab Results enhancements
-- Adds: triage_records table, consulted_at column for investigations

-- 1. TRIAGE_RECORDS (nurse pre-consultation assessment)
CREATE TABLE IF NOT EXISTS public.triage_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,

    chief_complaint TEXT,
    vital_signs JSONB DEFAULT '{}'::jsonb,
    allergies TEXT,
    current_medications TEXT,
    urgency_level TEXT DEFAULT 'routine'
        CHECK (urgency_level IN ('emergency', 'urgent', 'routine', 'non_urgent')),
    triage_note TEXT,

    status TEXT NOT NULL DEFAULT 'waiting'
        CHECK (status IN ('waiting', 'in_consultation', 'completed', 'cancelled')),

    triaged_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_triage_clinic ON public.triage_records(clinic_id);
CREATE INDEX IF NOT EXISTS idx_triage_patient ON public.triage_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_triage_appointment ON public.triage_records(appointment_id);
CREATE INDEX IF NOT EXISTS idx_triage_status ON public.triage_records(status);
CREATE INDEX IF NOT EXISTS idx_triage_urgency ON public.triage_records(urgency_level);
CREATE INDEX IF NOT EXISTS idx_triage_created ON public.triage_records(created_at DESC);

-- 3. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.update_triage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_triage_records_updated_at ON public.triage_records;
CREATE TRIGGER trg_triage_records_updated_at
    BEFORE UPDATE ON public.triage_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_triage_timestamp();

-- 4. RLS
ALTER TABLE public.triage_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'triage_records' AND policyname = 'triage_records_select') THEN
        CREATE POLICY triage_records_select ON public.triage_records FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'triage_records' AND policyname = 'triage_records_insert') THEN
        CREATE POLICY triage_records_insert ON public.triage_records FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'triage_records' AND policyname = 'triage_records_update') THEN
        CREATE POLICY triage_records_update ON public.triage_records FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'triage_records' AND policyname = 'triage_records_delete') THEN
        CREATE POLICY triage_records_delete ON public.triage_records FOR DELETE USING (true);
    END IF;
END $$;

-- 5. GRANTS — only new tables (ALL TABLES already covered by 00024)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.triage_records TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.triage_records TO authenticated;

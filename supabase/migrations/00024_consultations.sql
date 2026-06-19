-- Migration 00024: Consultation / EMR Module
-- Adds: consultations, diagnoses, prescriptions, investigations tables
-- Rwanda-ready: common diagnoses, medicines, and investigations seeded via RPC

-- 1. CONSULTATIONS (core encounter table)
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.users(id),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,

    -- Subjective
    chief_complaint TEXT,
    history_of_presenting_illness TEXT,

    -- Vital signs (JSONB for flexibility)
    vital_signs JSONB DEFAULT '{}'::jsonb,

    -- Objective
    physical_examination TEXT,

    -- Assessment
    assessment TEXT,

    -- Plan
    treatment_plan TEXT,
    follow_up_instructions TEXT,
    follow_up_date DATE,
    sick_leave_days INTEGER DEFAULT 0,

    -- Status
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed', 'cancelled')),

    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. DIAGNOSES
CREATE TABLE IF NOT EXISTS public.diagnoses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,

    icd_code TEXT,
    description TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'primary'
        CHECK (type IN ('primary', 'secondary', 'differential')),
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,

    medicine_name TEXT NOT NULL,
    strength TEXT,
    form TEXT,
    dosage TEXT,
    frequency TEXT,
    duration TEXT,
    quantity INTEGER,
    route TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,

    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INVESTIGATIONS (lab tests and imaging ordered)
CREATE TABLE IF NOT EXISTS public.investigations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,

    test_name TEXT NOT NULL,
    category TEXT,
    instructions TEXT,

    status TEXT NOT NULL DEFAULT 'ordered'
        CHECK (status IN ('ordered', 'sample_collected', 'in_progress', 'completed', 'cancelled')),

    result_value TEXT,
    result_unit TEXT,
    reference_range TEXT,
    is_abnormal BOOLEAN DEFAULT false,
    result_notes TEXT,
    result_entered_at TIMESTAMPTZ,
    result_entered_by UUID REFERENCES public.users(id),

    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. AUTO-CREATE CONSULTATION ON APPOINTMENT STATUS → in_progress
-- (Optional trigger: when appointment moves to in_progress, auto-create consultation)
-- We'll handle this in the service layer instead for more control.

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_consultations_clinic ON public.consultations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON public.consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON public.consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_appointment ON public.consultations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON public.consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_created ON public.consultations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_diagnoses_consultation ON public.diagnoses(consultation_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_patient ON public.diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_clinic ON public.diagnoses(clinic_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation ON public.prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_clinic ON public.prescriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_medicine ON public.prescriptions(medicine_name);

CREATE INDEX IF NOT EXISTS idx_investigations_consultation ON public.investigations(consultation_id);
CREATE INDEX IF NOT EXISTS idx_investigations_patient ON public.investigations(patient_id);
CREATE INDEX IF NOT EXISTS idx_investigations_clinic ON public.investigations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_investigations_status ON public.investigations(status);

-- 7. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.update_consultation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consultations_updated_at ON public.consultations;
CREATE TRIGGER trg_consultations_updated_at
    BEFORE UPDATE ON public.consultations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_consultation_timestamp();

-- 8. RLS POLICIES
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;

-- Permissive policies (matching existing pattern)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consultations' AND policyname = 'consultations_select') THEN
        CREATE POLICY consultations_select ON public.consultations FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consultations' AND policyname = 'consultations_insert') THEN
        CREATE POLICY consultations_insert ON public.consultations FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consultations' AND policyname = 'consultations_update') THEN
        CREATE POLICY consultations_update ON public.consultations FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consultations' AND policyname = 'consultations_delete') THEN
        CREATE POLICY consultations_delete ON public.consultations FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diagnoses' AND policyname = 'diagnoses_select') THEN
        CREATE POLICY diagnoses_select ON public.diagnoses FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diagnoses' AND policyname = 'diagnoses_insert') THEN
        CREATE POLICY diagnoses_insert ON public.diagnoses FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diagnoses' AND policyname = 'diagnoses_update') THEN
        CREATE POLICY diagnoses_update ON public.diagnoses FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diagnoses' AND policyname = 'diagnoses_delete') THEN
        CREATE POLICY diagnoses_delete ON public.diagnoses FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'prescriptions_select') THEN
        CREATE POLICY prescriptions_select ON public.prescriptions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'prescriptions_insert') THEN
        CREATE POLICY prescriptions_insert ON public.prescriptions FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'prescriptions_update') THEN
        CREATE POLICY prescriptions_update ON public.prescriptions FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'prescriptions_delete') THEN
        CREATE POLICY prescriptions_delete ON public.prescriptions FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investigations' AND policyname = 'investigations_select') THEN
        CREATE POLICY investigations_select ON public.investigations FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investigations' AND policyname = 'investigations_insert') THEN
        CREATE POLICY investigations_insert ON public.investigations FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investigations' AND policyname = 'investigations_update') THEN
        CREATE POLICY investigations_update ON public.investigations FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investigations' AND policyname = 'investigations_delete') THEN
        CREATE POLICY investigations_delete ON public.investigations FOR DELETE USING (true);
    END IF;
END $$;

-- 9. GRANTS TO ANON AND AUTHENTICATED
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

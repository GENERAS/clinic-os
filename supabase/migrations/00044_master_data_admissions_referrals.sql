-- Master Data tables
CREATE TABLE IF NOT EXISTS public.insurance_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  coverage_percent NUMERIC(5,2) DEFAULT 80,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lab_test_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  sample_type TEXT,
  reference_range TEXT,
  price NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medicine_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generic_name TEXT,
  strength TEXT,
  form TEXT,
  unit TEXT DEFAULT 'tablet',
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admissions (IPD)
CREATE TABLE IF NOT EXISTS public.admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id),
  admission_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  discharge_date TIMESTAMPTZ,
  ward TEXT NOT NULL,
  bed_number TEXT,
  admission_reason TEXT,
  diagnosis TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','discharged','transferred','left_ama')),
  discharge_summary TEXT,
  discharge_instructions TEXT,
  admitted_by UUID REFERENCES public.users(id),
  attending_doctor UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admission vitals (nursing notes)
CREATE TABLE IF NOT EXISTS public.admission_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES public.users(id),
  vital_signs JSONB NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admission medications
CREATE TABLE IF NOT EXISTS public.admission_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  route TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  prescribed_by UUID REFERENCES public.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id),
  referral_type TEXT NOT NULL CHECK (referral_type IN ('internal','external')),
  from_doctor_id UUID REFERENCES public.users(id),
  to_provider TEXT NOT NULL,
  to_facility TEXT,
  reason TEXT NOT NULL,
  clinical_summary TEXT,
  diagnosis TEXT,
  tests_done TEXT,
  treatment_given TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('urgent','normal','follow_up')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','completed','rejected')),
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_providers_clinic ON public.insurance_providers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_lab_test_catalog_clinic ON public.lab_test_catalog(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medicine_catalog_clinic ON public.medicine_catalog(clinic_id);
CREATE INDEX IF NOT EXISTS idx_admissions_clinic ON public.admissions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON public.admissions(status);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON public.admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admission_vitals_admission ON public.admission_vitals(admission_id);
CREATE INDEX IF NOT EXISTS idx_admission_medications_admission ON public.admission_medications(admission_id);
CREATE INDEX IF NOT EXISTS idx_referrals_clinic ON public.referrals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_patient ON public.referrals(patient_id);

-- RLS
ALTER TABLE public.insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_test_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic scoped" ON public.insurance_providers FOR ALL USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
CREATE POLICY "Clinic scoped" ON public.lab_test_catalog FOR ALL USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
CREATE POLICY "Clinic scoped" ON public.medicine_catalog FOR ALL USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
CREATE POLICY "Clinic scoped" ON public.admissions FOR ALL USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
CREATE POLICY "Clinic scoped" ON public.admission_vitals FOR ALL USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
CREATE POLICY "Clinic scoped" ON public.admission_medications FOR ALL USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
CREATE POLICY "Clinic scoped" ON public.referrals FOR ALL USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

REVOKE ALL ON public.insurance_providers FROM anon;
REVOKE ALL ON public.lab_test_catalog FROM anon;
REVOKE ALL ON public.medicine_catalog FROM anon;
REVOKE ALL ON public.admissions FROM anon;
REVOKE ALL ON public.admission_vitals FROM anon;
REVOKE ALL ON public.admission_medications FROM anon;
REVOKE ALL ON public.referrals FROM anon;

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_insurance_providers_updated_at ON public.insurance_providers;
CREATE TRIGGER trg_insurance_providers_updated_at
    BEFORE UPDATE ON public.insurance_providers
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

DROP TRIGGER IF EXISTS trg_lab_test_catalog_updated_at ON public.lab_test_catalog;
CREATE TRIGGER trg_lab_test_catalog_updated_at
    BEFORE UPDATE ON public.lab_test_catalog
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

DROP TRIGGER IF EXISTS trg_medicine_catalog_updated_at ON public.medicine_catalog;
CREATE TRIGGER trg_medicine_catalog_updated_at
    BEFORE UPDATE ON public.medicine_catalog
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

DROP TRIGGER IF EXISTS trg_admissions_updated_at ON public.admissions;
CREATE TRIGGER trg_admissions_updated_at
    BEFORE UPDATE ON public.admissions
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

DROP TRIGGER IF EXISTS trg_referrals_updated_at ON public.referrals;
CREATE TRIGGER trg_referrals_updated_at
    BEFORE UPDATE ON public.referrals
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

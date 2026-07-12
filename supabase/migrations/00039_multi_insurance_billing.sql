-- Migration 00039: Multi-Insurance Billing — Policies, Pre-Auth, Plans, Claim Items & Tax Classification
-- Safe to run repeatedly (IF NOT EXISTS / IF EXISTS)

-- 1. PATIENT INSURANCE (multiple insurance policies per patient)
CREATE TABLE IF NOT EXISTS public.patient_insurance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    member_name TEXT,
    relationship TEXT DEFAULT 'self',
    coverage_type TEXT DEFAULT 'basic' CHECK (coverage_type IN ('basic', 'premium', 'comprehensive')),
    annual_limit NUMERIC(12,2) DEFAULT 0,
    annual_used NUMERIC(12,2) DEFAULT 0,
    copay_percentage NUMERIC(5,2) DEFAULT 0,
    valid_from DATE,
    valid_until DATE,
    is_primary BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. INSURANCE PRE-AUTHORIZATIONS (pre-auth queue)
CREATE TABLE IF NOT EXISTS public.insurance_pre_authorizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    insurance_id UUID NOT NULL REFERENCES public.patient_insurance(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    auth_token TEXT,
    auth_document_url TEXT,
    procedure_description TEXT NOT NULL,
    estimated_cost NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    submitted_at TIMESTAMPTZ DEFAULT now(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. INSURANCE PLANS (plan definitions with caps)
CREATE TABLE IF NOT EXISTS public.insurance_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    coverage_type TEXT DEFAULT 'basic',
    annual_limit NUMERIC(12,2) DEFAULT 0,
    consultation_cap NUMERIC(12,2) DEFAULT 0,
    lab_cap NUMERIC(12,2) DEFAULT 0,
    procedure_cap NUMERIC(12,2) DEFAULT 0,
    pharmacy_cap NUMERIC(12,2) DEFAULT 0,
    copay_percentage NUMERIC(5,2) DEFAULT 0,
    pre_auth_required_above NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INSURANCE CLAIM ITEMS (line items for claims)
CREATE TABLE IF NOT EXISTS public.insurance_claim_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    claim_id UUID NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
    billing_line_item_id UUID REFERENCES public.billing_line_items(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    icd_code TEXT,
    cpt_code TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2) DEFAULT 0,
    covered_amount NUMERIC(10,2) DEFAULT 0,
    denial_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ADD tax_classification TO service_catalog
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS tax_classification TEXT DEFAULT 'D'
    CHECK (tax_classification IN ('A', 'B', 'C', 'D'));

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_patient_insurance_clinic ON public.patient_insurance(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_patient ON public.patient_insurance(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_provider ON public.patient_insurance(provider);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_status ON public.patient_insurance(status);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_policy ON public.patient_insurance(policy_number);

CREATE INDEX IF NOT EXISTS idx_insurance_pre_auth_clinic ON public.insurance_pre_authorizations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_insurance_pre_auth_patient ON public.insurance_pre_authorizations(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_pre_auth_insurance ON public.insurance_pre_authorizations(insurance_id);
CREATE INDEX IF NOT EXISTS idx_insurance_pre_auth_status ON public.insurance_pre_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_insurance_pre_auth_consultation ON public.insurance_pre_authorizations(consultation_id);

CREATE INDEX IF NOT EXISTS idx_insurance_plans_clinic ON public.insurance_plans(clinic_id);
CREATE INDEX IF NOT EXISTS idx_insurance_plans_provider ON public.insurance_plans(provider);
CREATE INDEX IF NOT EXISTS idx_insurance_plans_active ON public.insurance_plans(is_active);

CREATE INDEX IF NOT EXISTS idx_insurance_claim_items_claim ON public.insurance_claim_items(claim_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claim_items_billing ON public.insurance_claim_items(billing_line_item_id);

CREATE INDEX IF NOT EXISTS idx_service_catalog_tax ON public.service_catalog(tax_classification);

-- 7. UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS trg_patient_insurance_updated_at ON public.patient_insurance;
CREATE TRIGGER trg_patient_insurance_updated_at
    BEFORE UPDATE ON public.patient_insurance
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

DROP TRIGGER IF EXISTS trg_insurance_pre_auth_updated_at ON public.insurance_pre_authorizations;
CREATE TRIGGER trg_insurance_pre_auth_updated_at
    BEFORE UPDATE ON public.insurance_pre_authorizations
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

-- 8. RLS
ALTER TABLE public.patient_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_pre_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claim_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_insurance' AND policyname = 'patient_insurance_select') THEN
        CREATE POLICY patient_insurance_select ON public.patient_insurance FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_insurance' AND policyname = 'patient_insurance_insert') THEN
        CREATE POLICY patient_insurance_insert ON public.patient_insurance FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_insurance' AND policyname = 'patient_insurance_update') THEN
        CREATE POLICY patient_insurance_update ON public.patient_insurance FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_insurance' AND policyname = 'patient_insurance_delete') THEN
        CREATE POLICY patient_insurance_delete ON public.patient_insurance FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_pre_authorizations' AND policyname = 'insurance_pre_authorizations_select') THEN
        CREATE POLICY insurance_pre_authorizations_select ON public.insurance_pre_authorizations FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_pre_authorizations' AND policyname = 'insurance_pre_authorizations_insert') THEN
        CREATE POLICY insurance_pre_authorizations_insert ON public.insurance_pre_authorizations FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_pre_authorizations' AND policyname = 'insurance_pre_authorizations_update') THEN
        CREATE POLICY insurance_pre_authorizations_update ON public.insurance_pre_authorizations FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_pre_authorizations' AND policyname = 'insurance_pre_authorizations_delete') THEN
        CREATE POLICY insurance_pre_authorizations_delete ON public.insurance_pre_authorizations FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_plans' AND policyname = 'insurance_plans_select') THEN
        CREATE POLICY insurance_plans_select ON public.insurance_plans FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_plans' AND policyname = 'insurance_plans_insert') THEN
        CREATE POLICY insurance_plans_insert ON public.insurance_plans FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_plans' AND policyname = 'insurance_plans_update') THEN
        CREATE POLICY insurance_plans_update ON public.insurance_plans FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_plans' AND policyname = 'insurance_plans_delete') THEN
        CREATE POLICY insurance_plans_delete ON public.insurance_plans FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_claim_items' AND policyname = 'insurance_claim_items_select') THEN
        CREATE POLICY insurance_claim_items_select ON public.insurance_claim_items FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_claim_items' AND policyname = 'insurance_claim_items_insert') THEN
        CREATE POLICY insurance_claim_items_insert ON public.insurance_claim_items FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_claim_items' AND policyname = 'insurance_claim_items_update') THEN
        CREATE POLICY insurance_claim_items_update ON public.insurance_claim_items FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_claim_items' AND policyname = 'insurance_claim_items_delete') THEN
        CREATE POLICY insurance_claim_items_delete ON public.insurance_claim_items FOR DELETE USING (true);
    END IF;
END $$;

-- 9. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_insurance TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_insurance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_pre_authorizations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_pre_authorizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_claim_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_claim_items TO authenticated;

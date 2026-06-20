-- Migration 00026: Patient Billing, Insurance & Financials
-- Adds: patient insurance fields, service_catalog, billing_invoices, billing_line_items, patient_payments, insurance_claims

-- 1. PATIENT INSURANCE FIELDS
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS insurance_provider TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS insurance_coverage TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS insurance_member_name TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS insurance_relationship TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS insurance_valid_from DATE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS insurance_valid_until DATE;

-- 2. SERVICE CATALOG (billable services per clinic)
CREATE TABLE IF NOT EXISTS public.service_catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'consultation'
        CHECK (category IN ('consultation', 'lab', 'procedure', 'pharmacy', 'other')),
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. BILLING INVOICES (patient-facing bills, distinct from subscription invoices)
CREATE TABLE IF NOT EXISTS public.billing_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'issued', 'paid', 'partially_paid', 'cancelled', 'refunded')),
    insurance_claim_id UUID,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    issued_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. BILLING LINE ITEMS
CREATE TABLE IF NOT EXISTS public.billing_line_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    service_catalog_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PATIENT PAYMENTS (payments collected against invoices)
CREATE TABLE IF NOT EXISTS public.patient_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.billing_invoices(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL
        CHECK (payment_method IN ('cash', 'mtn_momo', 'airtel_money', 'bank_transfer', 'card', 'insurance', 'other')),
    transaction_reference TEXT,
    payment_date TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    received_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. INSURANCE CLAIMS (RSSB/Mutuelle/eClaims)
CREATE TABLE IF NOT EXISTS public.insurance_claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    policy_number TEXT,
    claim_number TEXT UNIQUE,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    covered_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    co_pay_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'approved', 'partially_approved', 'rejected', 'paid')),
    submission_date TIMESTAMPTZ,
    approval_date TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.billing_invoices
    ADD CONSTRAINT fk_billing_invoices_insurance_claim
    FOREIGN KEY (insurance_claim_id) REFERENCES public.insurance_claims(id) ON DELETE SET NULL;

-- 7. INVOICE NUMBER SEQUENCE
CREATE SEQUENCE IF NOT EXISTS public.billing_invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_billing_invoice_number()
RETURNS TEXT AS $$
DECLARE
    seq_val BIGINT;
BEGIN
    seq_val := nextval('public.billing_invoice_number_seq');
    RETURN 'BILL-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 8. INDEXES
CREATE INDEX IF NOT EXISTS idx_service_catalog_clinic ON public.service_catalog(clinic_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_active ON public.service_catalog(is_active);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_clinic ON public.billing_invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_patient ON public.billing_invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_consultation ON public.billing_invoices(consultation_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON public.billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_created ON public.billing_invoices(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_line_items_invoice ON public.billing_line_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_patient_payments_clinic ON public.patient_payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patient_payments_invoice ON public.patient_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_patient_payments_patient ON public.patient_payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_payments_date ON public.patient_payments(payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_clinic ON public.insurance_claims(clinic_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_patient ON public.insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON public.insurance_claims(status);

-- 9. UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION public.update_billing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_billing_invoices_updated_at ON public.billing_invoices;
CREATE TRIGGER trg_billing_invoices_updated_at
    BEFORE UPDATE ON public.billing_invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

DROP TRIGGER IF EXISTS trg_insurance_claims_updated_at ON public.insurance_claims;
CREATE TRIGGER trg_insurance_claims_updated_at
    BEFORE UPDATE ON public.insurance_claims
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

-- 10. RLS
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_catalog' AND policyname = 'service_catalog_select') THEN
        CREATE POLICY service_catalog_select ON public.service_catalog FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_catalog' AND policyname = 'service_catalog_insert') THEN
        CREATE POLICY service_catalog_insert ON public.service_catalog FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_catalog' AND policyname = 'service_catalog_update') THEN
        CREATE POLICY service_catalog_update ON public.service_catalog FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_catalog' AND policyname = 'service_catalog_delete') THEN
        CREATE POLICY service_catalog_delete ON public.service_catalog FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_invoices' AND policyname = 'billing_invoices_select') THEN
        CREATE POLICY billing_invoices_select ON public.billing_invoices FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_invoices' AND policyname = 'billing_invoices_insert') THEN
        CREATE POLICY billing_invoices_insert ON public.billing_invoices FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_invoices' AND policyname = 'billing_invoices_update') THEN
        CREATE POLICY billing_invoices_update ON public.billing_invoices FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_invoices' AND policyname = 'billing_invoices_delete') THEN
        CREATE POLICY billing_invoices_delete ON public.billing_invoices FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_line_items' AND policyname = 'billing_line_items_select') THEN
        CREATE POLICY billing_line_items_select ON public.billing_line_items FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_line_items' AND policyname = 'billing_line_items_insert') THEN
        CREATE POLICY billing_line_items_insert ON public.billing_line_items FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_line_items' AND policyname = 'billing_line_items_update') THEN
        CREATE POLICY billing_line_items_update ON public.billing_line_items FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_line_items' AND policyname = 'billing_line_items_delete') THEN
        CREATE POLICY billing_line_items_delete ON public.billing_line_items FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_payments' AND policyname = 'patient_payments_select') THEN
        CREATE POLICY patient_payments_select ON public.patient_payments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_payments' AND policyname = 'patient_payments_insert') THEN
        CREATE POLICY patient_payments_insert ON public.patient_payments FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_payments' AND policyname = 'patient_payments_update') THEN
        CREATE POLICY patient_payments_update ON public.patient_payments FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_payments' AND policyname = 'patient_payments_delete') THEN
        CREATE POLICY patient_payments_delete ON public.patient_payments FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_claims' AND policyname = 'insurance_claims_select') THEN
        CREATE POLICY insurance_claims_select ON public.insurance_claims FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_claims' AND policyname = 'insurance_claims_insert') THEN
        CREATE POLICY insurance_claims_insert ON public.insurance_claims FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_claims' AND policyname = 'insurance_claims_update') THEN
        CREATE POLICY insurance_claims_update ON public.insurance_claims FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_claims' AND policyname = 'insurance_claims_delete') THEN
        CREATE POLICY insurance_claims_delete ON public.insurance_claims FOR DELETE USING (true);
    END IF;
END $$;

-- 11. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

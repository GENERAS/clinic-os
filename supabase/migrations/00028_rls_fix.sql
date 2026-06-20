-- Migration 00028: Fix RLS policies for Phase 1-4 tables
-- Replaces permissive `true` policies with clinic-scoped policies
-- Uses SECURITY DEFINER helpers as workaround for auth.uid() returning NULL
-- Pattern: clinic_id = (SELECT clinic_id FROM public.users WHERE id = current_user_id())

-- 1. SECURITY DEFINER HELPERS
-- These run as the function owner (bypass RLS) and extract user identity from JWT
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', TRUE), '')::UUID;
$$;

CREATE OR REPLACE FUNCTION public.current_user_clinic_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT clinic_id FROM public.users WHERE id = public.current_user_id();
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(is_super_admin, false) FROM public.users WHERE id = public.current_user_id();
$$;

-- 2. FIX GRANTS — revoke anon DML, keep only SELECT
REVOKE INSERT, UPDATE, DELETE ON public.consultations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.diagnoses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.prescriptions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.investigations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.triage_records FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.service_catalog FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.billing_invoices FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.billing_line_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.patient_payments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.insurance_claims FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.inventory_batches FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.dispensations FROM anon;

-- Authenticated role keeps full DML (already granted by prior migrations)

-- 3. CONSULTATIONS
DROP POLICY IF EXISTS consultations_select ON public.consultations;
DROP POLICY IF EXISTS consultations_insert ON public.consultations;
DROP POLICY IF EXISTS consultations_update ON public.consultations;
DROP POLICY IF EXISTS consultations_delete ON public.consultations;

CREATE POLICY consultations_select ON public.consultations FOR SELECT
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY consultations_insert ON public.consultations FOR INSERT
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY consultations_update ON public.consultations FOR UPDATE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY consultations_delete ON public.consultations FOR DELETE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

-- 4. DIAGNOSES
DROP POLICY IF EXISTS diagnoses_select ON public.diagnoses;
DROP POLICY IF EXISTS diagnoses_insert ON public.diagnoses;
DROP POLICY IF EXISTS diagnoses_update ON public.diagnoses;
DROP POLICY IF EXISTS diagnoses_delete ON public.diagnoses;

CREATE POLICY diagnoses_select ON public.diagnoses FOR SELECT
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY diagnoses_insert ON public.diagnoses FOR INSERT
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY diagnoses_update ON public.diagnoses FOR UPDATE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY diagnoses_delete ON public.diagnoses FOR DELETE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

-- 5. PRESCRIPTIONS
DROP POLICY IF EXISTS prescriptions_select ON public.prescriptions;
DROP POLICY IF EXISTS prescriptions_insert ON public.prescriptions;
DROP POLICY IF EXISTS prescriptions_update ON public.prescriptions;
DROP POLICY IF EXISTS prescriptions_delete ON public.prescriptions;

CREATE POLICY prescriptions_select ON public.prescriptions FOR SELECT
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY prescriptions_insert ON public.prescriptions FOR INSERT
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY prescriptions_update ON public.prescriptions FOR UPDATE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY prescriptions_delete ON public.prescriptions FOR DELETE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

-- 6. INVESTIGATIONS
DROP POLICY IF EXISTS investigations_select ON public.investigations;
DROP POLICY IF EXISTS investigations_insert ON public.investigations;
DROP POLICY IF EXISTS investigations_update ON public.investigations;
DROP POLICY IF EXISTS investigations_delete ON public.investigations;

CREATE POLICY investigations_select ON public.investigations FOR SELECT
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY investigations_insert ON public.investigations FOR INSERT
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY investigations_update ON public.investigations FOR UPDATE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY investigations_delete ON public.investigations FOR DELETE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

-- 7. TRIAGE RECORDS
DROP POLICY IF EXISTS triage_records_select ON public.triage_records;
DROP POLICY IF EXISTS triage_records_insert ON public.triage_records;
DROP POLICY IF EXISTS triage_records_update ON public.triage_records;
DROP POLICY IF EXISTS triage_records_delete ON public.triage_records;

CREATE POLICY triage_records_select ON public.triage_records FOR SELECT
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY triage_records_insert ON public.triage_records FOR INSERT
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY triage_records_update ON public.triage_records FOR UPDATE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY triage_records_delete ON public.triage_records FOR DELETE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

-- 8. SERVICE CATALOG
DROP POLICY IF EXISTS service_catalog_select ON public.service_catalog;
DROP POLICY IF EXISTS service_catalog_insert ON public.service_catalog;
DROP POLICY IF EXISTS service_catalog_update ON public.service_catalog;
DROP POLICY IF EXISTS service_catalog_delete ON public.service_catalog;

CREATE POLICY service_catalog_select ON public.service_catalog FOR SELECT
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY service_catalog_insert ON public.service_catalog FOR INSERT
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY service_catalog_update ON public.service_catalog FOR UPDATE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY service_catalog_delete ON public.service_catalog FOR DELETE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

-- 9. BILLING INVOICES
DROP POLICY IF EXISTS billing_invoices_select ON public.billing_invoices;
DROP POLICY IF EXISTS billing_invoices_insert ON public.billing_invoices;
DROP POLICY IF EXISTS billing_invoices_update ON public.billing_invoices;
DROP POLICY IF EXISTS billing_invoices_delete ON public.billing_invoices;

CREATE POLICY billing_invoices_select ON public.billing_invoices FOR SELECT
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY billing_invoices_insert ON public.billing_invoices FOR INSERT
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY billing_invoices_update ON public.billing_invoices FOR UPDATE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY billing_invoices_delete ON public.billing_invoices FOR DELETE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

-- 10. BILLING LINE ITEMS (no direct clinic_id — scope via parent billing_invoices)
DROP POLICY IF EXISTS billing_line_items_select ON public.billing_line_items;
DROP POLICY IF EXISTS billing_line_items_insert ON public.billing_line_items;
DROP POLICY IF EXISTS billing_line_items_update ON public.billing_line_items;
DROP POLICY IF EXISTS billing_line_items_delete ON public.billing_line_items;

CREATE POLICY billing_line_items_select ON public.billing_line_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.billing_invoices
            WHERE id = invoice_id
            AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
        )
    );

CREATE POLICY billing_line_items_insert ON public.billing_line_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.billing_invoices
            WHERE id = invoice_id
            AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
        )
    );

CREATE POLICY billing_line_items_update ON public.billing_line_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.billing_invoices
            WHERE id = invoice_id
            AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.billing_invoices
            WHERE id = invoice_id
            AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
        )
    );

CREATE POLICY billing_line_items_delete ON public.billing_line_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.billing_invoices
            WHERE id = invoice_id
            AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
        )
    );

-- 11. PATIENT PAYMENTS
DROP POLICY IF EXISTS patient_payments_select ON public.patient_payments;
DROP POLICY IF EXISTS patient_payments_insert ON public.patient_payments;
DROP POLICY IF EXISTS patient_payments_update ON public.patient_payments;
DROP POLICY IF EXISTS patient_payments_delete ON public.patient_payments;

CREATE POLICY patient_payments_select ON public.patient_payments FOR SELECT
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY patient_payments_insert ON public.patient_payments FOR INSERT
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY patient_payments_update ON public.patient_payments FOR UPDATE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY patient_payments_delete ON public.patient_payments FOR DELETE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

-- 12. INSURANCE CLAIMS
DROP POLICY IF EXISTS insurance_claims_select ON public.insurance_claims;
DROP POLICY IF EXISTS insurance_claims_insert ON public.insurance_claims;
DROP POLICY IF EXISTS insurance_claims_update ON public.insurance_claims;
DROP POLICY IF EXISTS insurance_claims_delete ON public.insurance_claims;

CREATE POLICY insurance_claims_select ON public.insurance_claims FOR SELECT
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY insurance_claims_insert ON public.insurance_claims FOR INSERT
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY insurance_claims_update ON public.insurance_claims FOR UPDATE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY insurance_claims_delete ON public.insurance_claims FOR DELETE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

-- 13. INVENTORY BATCHES
DROP POLICY IF EXISTS inventory_batches_select ON public.inventory_batches;
DROP POLICY IF EXISTS inventory_batches_insert ON public.inventory_batches;
DROP POLICY IF EXISTS inventory_batches_update ON public.inventory_batches;
DROP POLICY IF EXISTS inventory_batches_delete ON public.inventory_batches;

CREATE POLICY inventory_batches_select ON public.inventory_batches FOR SELECT
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY inventory_batches_insert ON public.inventory_batches FOR INSERT
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY inventory_batches_update ON public.inventory_batches FOR UPDATE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY inventory_batches_delete ON public.inventory_batches FOR DELETE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

-- 14. DISPENSATIONS
DROP POLICY IF EXISTS dispensations_select ON public.dispensations;
DROP POLICY IF EXISTS dispensations_insert ON public.dispensations;
DROP POLICY IF EXISTS dispensations_update ON public.dispensations;
DROP POLICY IF EXISTS dispensations_delete ON public.dispensations;

CREATE POLICY dispensations_select ON public.dispensations FOR SELECT
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY dispensations_insert ON public.dispensations FOR INSERT
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY dispensations_update ON public.dispensations FOR UPDATE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

CREATE POLICY dispensations_delete ON public.dispensations FOR DELETE
    USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

-- 15. FIX EXISTING HELPER FUNCTIONS (used by 90+ policies from migrations 00001-00019)
-- These are SECURITY DEFINER but still reference auth.uid() which returns NULL
-- Use CREATE OR REPLACE to preserve existing policy references
CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT clinic_id FROM public.users WHERE id = public.current_user_id();
$$;

CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT clinic_id FROM public.users WHERE id = public.current_user_id();
$$;

-- 16. FIX users TABLE POLICIES (affects login, dashboard staff count, profile)
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
    FOR SELECT USING (id = public.current_user_id() OR public.current_user_is_super_admin());

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
    FOR UPDATE USING (id = public.current_user_id() OR public.current_user_is_super_admin())
    WITH CHECK (id = public.current_user_id() OR public.current_user_is_super_admin());

-- 17. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

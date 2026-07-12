-- Migration 00040: Tax/RRA, Inventory, MOH Quality, Scheduling & Data Privacy
-- Safe to run repeatedly (IF NOT EXISTS / IF EXISTS)

-- ============================================================
-- PHASE 2: TAX / RRA / EBM
-- ============================================================

-- 1. CLINIC TAX SETTINGS
CREATE TABLE IF NOT EXISTS public.clinic_tax_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE UNIQUE,
    tin_number TEXT NOT NULL,
    business_name TEXT NOT NULL,
    ebm_serial_number TEXT,
    tax_rate NUMERIC(5,2) DEFAULT 18.00,
    default_tax_class TEXT DEFAULT 'D' CHECK (default_tax_class IN ('A', 'B', 'C', 'D')),
    last_fiscal_receipt_number INTEGER DEFAULT 0,
    rrn_api_endpoint TEXT DEFAULT 'https://api.rra.rw/v2/osdc',
    is_ebm_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. FISCAL RECEIPTS
CREATE TABLE IF NOT EXISTS public.fiscal_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.billing_invoices(id) ON DELETE SET NULL,
    fiscal_number TEXT NOT NULL,
    receipt_number INTEGER NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    tax_amount NUMERIC(10,2) NOT NULL,
    tax_class TEXT NOT NULL,
    cryptographic_signature TEXT,
    qr_code_data TEXT,
    rra_status TEXT DEFAULT 'pending' CHECK (rra_status IN ('pending', 'validated', 'rejected', 'error')),
    rra_response JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHASE 3: INVENTORY ENHANCEMENTS
-- ============================================================

-- 3. SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    lead_time_days INTEGER DEFAULT 7,
    rating INTEGER DEFAULT 3 CHECK (rating >= 1 AND rating <= 5),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. SUPPLIER ITEMS
CREATE TABLE IF NOT EXISTS public.supplier_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    unit_price NUMERIC(10,2) DEFAULT 0,
    minimum_order_quantity INTEGER DEFAULT 1,
    last_ordered_at TIMESTAMPTZ,
    notes TEXT,
    UNIQUE(supplier_id, inventory_item_id)
);

-- 5. PROCEDURE CONSUMABLES
CREATE TABLE IF NOT EXISTS public.procedure_consumables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    procedure_name TEXT NOT NULL,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity_required NUMERIC(8,2) DEFAULT 1,
    is_optional BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'received', 'cancelled')),
    total_amount NUMERIC(10,2) DEFAULT 0,
    expected_delivery DATE,
    received_date DATE,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. PURCHASE ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) DEFAULT 0,
    received_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. STOCK TRANSFERS
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    source_clinic_id UUID NOT NULL REFERENCES public.clinics(id),
    destination_clinic_id UUID NOT NULL REFERENCES public.clinics(id),
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'received', 'cancelled')),
    reason TEXT,
    requested_by UUID REFERENCES public.users(id),
    received_by UUID REFERENCES public.users(id),
    requested_at TIMESTAMPTZ DEFAULT now(),
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHASE 4: MOH QUALITY STANDARDS
-- ============================================================

-- 9. STAFF CREDENTIALS
CREATE TABLE IF NOT EXISTS public.staff_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    credential_type TEXT NOT NULL CHECK (credential_type IN ('medical_license', 'nursing_license', 'pharmacy_license', 'lab_certification', 'cpr_certification', 'infection_control', 'other')),
    credential_number TEXT NOT NULL,
    issuing_authority TEXT NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    document_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'pending_renewal')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. IPC LOGS
CREATE TABLE IF NOT EXISTS public.ipc_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    log_type TEXT NOT NULL CHECK (log_type IN ('sterilization', 'hand_hygiene', 'waste_disposal', 'surface_disinfection', 'equipment_maintenance', 'other')),
    description TEXT NOT NULL,
    equipment_name TEXT,
    autoclave_cycle_id TEXT,
    temperature NUMERIC(5,2),
    pressure NUMERIC(5,2),
    duration_minutes INTEGER,
    performed_by UUID REFERENCES public.users(id),
    verified_by UUID REFERENCES public.users(id),
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending_verification')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. EQUIPMENT MAINTENANCE
CREATE TABLE IF NOT EXISTS public.equipment_maintenance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    equipment_name TEXT NOT NULL,
    equipment_id TEXT,
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'calibration', 'inspection')),
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue')),
    technician_name TEXT,
    cost NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    next_maintenance_date DATE,
    performed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. COMPLIANCE REPORTS
CREATE TABLE IF NOT EXISTS public.compliance_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('monthly_moh', 'dhis2', 'ipc_monthly', 'accreditation', 'disease_surveillance', 'maternal_health', 'other')),
    report_period DATE NOT NULL,
    report_data JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected')),
    submitted_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. ACCREDITATION ITEMS
CREATE TABLE IF NOT EXISTS public.accreditation_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    item_description TEXT NOT NULL,
    is_met BOOLEAN DEFAULT false,
    evidence_url TEXT,
    last_verified_date DATE,
    next_review_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHASE 5: HEALTHCARE SCHEDULING
-- ============================================================

-- 14. DOCTOR SCHEDULES
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER DEFAULT 30,
    max_patients INTEGER DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. DOCTOR FACILITY ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.doctor_facility_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    facility_name TEXT NOT NULL,
    facility_address TEXT,
    days_per_week INTEGER DEFAULT 1,
    day_of_week INTEGER[] DEFAULT '{}',
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. SHIFTS
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    shift_name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. STAFF SHIFT ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.staff_shift_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    assignment_date DATE NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'absent', 'swapped')),
    swap_with UUID REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. QUEUE STATUS
CREATE TABLE IF NOT EXISTS public.queue_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    queue_number INTEGER NOT NULL,
    position INTEGER NOT NULL,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_consultation', 'completed', 'no_show', 'cancelled')),
    check_in_time TIMESTAMPTZ DEFAULT now(),
    called_time TIMESTAMPTZ,
    completed_time TIMESTAMPTZ,
    sms_notified BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. PROVIDER REVENUE SPLITS
CREATE TABLE IF NOT EXISTS public.provider_revenue_splits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    split_type TEXT NOT NULL CHECK (split_type IN ('percentage', 'fixed')),
    consultation_split NUMERIC(5,2) DEFAULT 0,
    procedure_split NUMERIC(5,2) DEFAULT 0,
    lab_split NUMERIC(5,2) DEFAULT 0,
    pharmacy_split NUMERIC(5,2) DEFAULT 0,
    consultation_fixed NUMERIC(10,2) DEFAULT 0,
    procedure_fixed NUMERIC(10,2) DEFAULT 0,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHASE 6: DATA PRIVACY
-- ============================================================

-- 20. PATIENT CONSENTS
CREATE TABLE IF NOT EXISTS public.patient_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('treatment', 'data_sharing', 'marketing', 'research', 'insurance_claim', 'referral')),
    consent_given BOOLEAN NOT NULL DEFAULT true,
    consent_date TIMESTAMPTZ DEFAULT now(),
    expiry_date DATE,
    witness_id UUID REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 21. DATA ACCESS LOGS
CREATE TABLE IF NOT EXISTS public.data_access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    action TEXT NOT NULL CHECK (action IN ('view', 'export', 'print', 'modify', 'delete')),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    fields_accessed TEXT[],
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 22. DATA RETENTION POLICIES
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    retention_days INTEGER NOT NULL DEFAULT 2555,
    archive_after_days INTEGER DEFAULT 365,
    delete_after_days INTEGER DEFAULT 3650,
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES (ALL tables)
-- ============================================================

-- Phase 2: Tax/RRA
CREATE INDEX IF NOT EXISTS idx_clinic_tax_settings_clinic ON public.clinic_tax_settings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_tax_settings_tin ON public.clinic_tax_settings(tin_number);
CREATE INDEX IF NOT EXISTS idx_fiscal_receipts_clinic ON public.fiscal_receipts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_receipts_invoice ON public.fiscal_receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_receipts_status ON public.fiscal_receipts(rra_status);
CREATE INDEX IF NOT EXISTS idx_fiscal_receipts_fiscal_number ON public.fiscal_receipts(fiscal_number);

-- Phase 3: Inventory
CREATE INDEX IF NOT EXISTS idx_suppliers_clinic ON public.suppliers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_supplier_items_supplier ON public.supplier_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_items_item ON public.supplier_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_procedure_consumables_clinic ON public.procedure_consumables(clinic_id);
CREATE INDEX IF NOT EXISTS idx_procedure_consumables_procedure ON public.procedure_consumables(procedure_name);
CREATE INDEX IF NOT EXISTS idx_procedure_consumables_item ON public.procedure_consumables(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_clinic ON public.purchase_orders(clinic_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item ON public.purchase_order_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_clinic ON public.stock_transfers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_source ON public.stock_transfers(source_clinic_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_destination ON public.stock_transfers(destination_clinic_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON public.stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_item ON public.stock_transfers(inventory_item_id);

-- Phase 4: MOH Quality
CREATE INDEX IF NOT EXISTS idx_staff_credentials_clinic ON public.staff_credentials(clinic_id);
CREATE INDEX IF NOT EXISTS idx_staff_credentials_staff ON public.staff_credentials(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_credentials_status ON public.staff_credentials(status);
CREATE INDEX IF NOT EXISTS idx_staff_credentials_expiry ON public.staff_credentials(expiry_date);
CREATE INDEX IF NOT EXISTS idx_ipc_logs_clinic ON public.ipc_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ipc_logs_date ON public.ipc_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_ipc_logs_type ON public.ipc_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_clinic ON public.equipment_maintenance(clinic_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_status ON public.equipment_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_scheduled ON public.equipment_maintenance(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_clinic ON public.compliance_reports(clinic_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type ON public.compliance_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_status ON public.compliance_reports(status);
CREATE INDEX IF NOT EXISTS idx_accreditation_items_clinic ON public.accreditation_items(clinic_id);
CREATE INDEX IF NOT EXISTS idx_accreditation_items_category ON public.accreditation_items(category);

-- Phase 5: Scheduling
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_clinic ON public.doctor_schedules(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor ON public.doctor_schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_day ON public.doctor_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_doctor_facility_assignments_clinic ON public.doctor_facility_assignments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctor_facility_assignments_doctor ON public.doctor_facility_assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_shifts_clinic ON public.shifts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_assignments_clinic ON public.staff_shift_assignments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_assignments_staff ON public.staff_shift_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_assignments_shift ON public.staff_shift_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_assignments_date ON public.staff_shift_assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_queue_status_clinic ON public.queue_status(clinic_id);
CREATE INDEX IF NOT EXISTS idx_queue_status_patient ON public.queue_status(patient_id);
CREATE INDEX IF NOT EXISTS idx_queue_status_appointment ON public.queue_status(appointment_id);
CREATE INDEX IF NOT EXISTS idx_queue_status_status ON public.queue_status(status);
CREATE INDEX IF NOT EXISTS idx_provider_revenue_splits_clinic ON public.provider_revenue_splits(clinic_id);
CREATE INDEX IF NOT EXISTS idx_provider_revenue_splits_provider ON public.provider_revenue_splits(provider_id);

-- Phase 6: Privacy
CREATE INDEX IF NOT EXISTS idx_patient_consents_clinic ON public.patient_consents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient ON public.patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_type ON public.patient_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_clinic ON public.data_access_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_user ON public.data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_entity ON public.data_access_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_action ON public.data_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_data_retention_policies_clinic ON public.data_retention_policies(clinic_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS trg_clinic_tax_settings_updated_at ON public.clinic_tax_settings;
CREATE TRIGGER trg_clinic_tax_settings_updated_at
    BEFORE UPDATE ON public.clinic_tax_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated_at
    BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

DROP TRIGGER IF EXISTS trg_staff_credentials_updated_at ON public.staff_credentials;
CREATE TRIGGER trg_staff_credentials_updated_at
    BEFORE UPDATE ON public.staff_credentials
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

DROP TRIGGER IF EXISTS trg_accreditation_items_updated_at ON public.accreditation_items;
CREATE TRIGGER trg_accreditation_items_updated_at
    BEFORE UPDATE ON public.accreditation_items
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

-- ============================================================
-- RLS (permissive FOR SELECT USING (true) pattern)
-- ============================================================

ALTER TABLE public.clinic_tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipc_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accreditation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_facility_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_revenue_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- clinic_tax_settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinic_tax_settings' AND policyname = 'clinic_tax_settings_select') THEN
        CREATE POLICY clinic_tax_settings_select ON public.clinic_tax_settings FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinic_tax_settings' AND policyname = 'clinic_tax_settings_insert') THEN
        CREATE POLICY clinic_tax_settings_insert ON public.clinic_tax_settings FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinic_tax_settings' AND policyname = 'clinic_tax_settings_update') THEN
        CREATE POLICY clinic_tax_settings_update ON public.clinic_tax_settings FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinic_tax_settings' AND policyname = 'clinic_tax_settings_delete') THEN
        CREATE POLICY clinic_tax_settings_delete ON public.clinic_tax_settings FOR DELETE USING (true);
    END IF;

    -- fiscal_receipts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fiscal_receipts' AND policyname = 'fiscal_receipts_select') THEN
        CREATE POLICY fiscal_receipts_select ON public.fiscal_receipts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fiscal_receipts' AND policyname = 'fiscal_receipts_insert') THEN
        CREATE POLICY fiscal_receipts_insert ON public.fiscal_receipts FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fiscal_receipts' AND policyname = 'fiscal_receipts_update') THEN
        CREATE POLICY fiscal_receipts_update ON public.fiscal_receipts FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fiscal_receipts' AND policyname = 'fiscal_receipts_delete') THEN
        CREATE POLICY fiscal_receipts_delete ON public.fiscal_receipts FOR DELETE USING (true);
    END IF;

    -- suppliers
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'suppliers_select') THEN
        CREATE POLICY suppliers_select ON public.suppliers FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'suppliers_insert') THEN
        CREATE POLICY suppliers_insert ON public.suppliers FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'suppliers_update') THEN
        CREATE POLICY suppliers_update ON public.suppliers FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'suppliers_delete') THEN
        CREATE POLICY suppliers_delete ON public.suppliers FOR DELETE USING (true);
    END IF;

    -- supplier_items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_items' AND policyname = 'supplier_items_select') THEN
        CREATE POLICY supplier_items_select ON public.supplier_items FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_items' AND policyname = 'supplier_items_insert') THEN
        CREATE POLICY supplier_items_insert ON public.supplier_items FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_items' AND policyname = 'supplier_items_update') THEN
        CREATE POLICY supplier_items_update ON public.supplier_items FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_items' AND policyname = 'supplier_items_delete') THEN
        CREATE POLICY supplier_items_delete ON public.supplier_items FOR DELETE USING (true);
    END IF;

    -- procedure_consumables
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procedure_consumables' AND policyname = 'procedure_consumables_select') THEN
        CREATE POLICY procedure_consumables_select ON public.procedure_consumables FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procedure_consumables' AND policyname = 'procedure_consumables_insert') THEN
        CREATE POLICY procedure_consumables_insert ON public.procedure_consumables FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procedure_consumables' AND policyname = 'procedure_consumables_update') THEN
        CREATE POLICY procedure_consumables_update ON public.procedure_consumables FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procedure_consumables' AND policyname = 'procedure_consumables_delete') THEN
        CREATE POLICY procedure_consumables_delete ON public.procedure_consumables FOR DELETE USING (true);
    END IF;

    -- purchase_orders
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'purchase_orders_select') THEN
        CREATE POLICY purchase_orders_select ON public.purchase_orders FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'purchase_orders_insert') THEN
        CREATE POLICY purchase_orders_insert ON public.purchase_orders FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'purchase_orders_update') THEN
        CREATE POLICY purchase_orders_update ON public.purchase_orders FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'purchase_orders_delete') THEN
        CREATE POLICY purchase_orders_delete ON public.purchase_orders FOR DELETE USING (true);
    END IF;

    -- purchase_order_items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_items' AND policyname = 'purchase_order_items_select') THEN
        CREATE POLICY purchase_order_items_select ON public.purchase_order_items FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_items' AND policyname = 'purchase_order_items_insert') THEN
        CREATE POLICY purchase_order_items_insert ON public.purchase_order_items FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_items' AND policyname = 'purchase_order_items_update') THEN
        CREATE POLICY purchase_order_items_update ON public.purchase_order_items FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_items' AND policyname = 'purchase_order_items_delete') THEN
        CREATE POLICY purchase_order_items_delete ON public.purchase_order_items FOR DELETE USING (true);
    END IF;

    -- stock_transfers
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_transfers' AND policyname = 'stock_transfers_select') THEN
        CREATE POLICY stock_transfers_select ON public.stock_transfers FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_transfers' AND policyname = 'stock_transfers_insert') THEN
        CREATE POLICY stock_transfers_insert ON public.stock_transfers FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_transfers' AND policyname = 'stock_transfers_update') THEN
        CREATE POLICY stock_transfers_update ON public.stock_transfers FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_transfers' AND policyname = 'stock_transfers_delete') THEN
        CREATE POLICY stock_transfers_delete ON public.stock_transfers FOR DELETE USING (true);
    END IF;

    -- staff_credentials
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_credentials' AND policyname = 'staff_credentials_select') THEN
        CREATE POLICY staff_credentials_select ON public.staff_credentials FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_credentials' AND policyname = 'staff_credentials_insert') THEN
        CREATE POLICY staff_credentials_insert ON public.staff_credentials FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_credentials' AND policyname = 'staff_credentials_update') THEN
        CREATE POLICY staff_credentials_update ON public.staff_credentials FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_credentials' AND policyname = 'staff_credentials_delete') THEN
        CREATE POLICY staff_credentials_delete ON public.staff_credentials FOR DELETE USING (true);
    END IF;

    -- ipc_logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ipc_logs' AND policyname = 'ipc_logs_select') THEN
        CREATE POLICY ipc_logs_select ON public.ipc_logs FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ipc_logs' AND policyname = 'ipc_logs_insert') THEN
        CREATE POLICY ipc_logs_insert ON public.ipc_logs FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ipc_logs' AND policyname = 'ipc_logs_update') THEN
        CREATE POLICY ipc_logs_update ON public.ipc_logs FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ipc_logs' AND policyname = 'ipc_logs_delete') THEN
        CREATE POLICY ipc_logs_delete ON public.ipc_logs FOR DELETE USING (true);
    END IF;

    -- equipment_maintenance
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'equipment_maintenance' AND policyname = 'equipment_maintenance_select') THEN
        CREATE POLICY equipment_maintenance_select ON public.equipment_maintenance FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'equipment_maintenance' AND policyname = 'equipment_maintenance_insert') THEN
        CREATE POLICY equipment_maintenance_insert ON public.equipment_maintenance FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'equipment_maintenance' AND policyname = 'equipment_maintenance_update') THEN
        CREATE POLICY equipment_maintenance_update ON public.equipment_maintenance FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'equipment_maintenance' AND policyname = 'equipment_maintenance_delete') THEN
        CREATE POLICY equipment_maintenance_delete ON public.equipment_maintenance FOR DELETE USING (true);
    END IF;

    -- compliance_reports
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compliance_reports' AND policyname = 'compliance_reports_select') THEN
        CREATE POLICY compliance_reports_select ON public.compliance_reports FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compliance_reports' AND policyname = 'compliance_reports_insert') THEN
        CREATE POLICY compliance_reports_insert ON public.compliance_reports FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compliance_reports' AND policyname = 'compliance_reports_update') THEN
        CREATE POLICY compliance_reports_update ON public.compliance_reports FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compliance_reports' AND policyname = 'compliance_reports_delete') THEN
        CREATE POLICY compliance_reports_delete ON public.compliance_reports FOR DELETE USING (true);
    END IF;

    -- accreditation_items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accreditation_items' AND policyname = 'accreditation_items_select') THEN
        CREATE POLICY accreditation_items_select ON public.accreditation_items FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accreditation_items' AND policyname = 'accreditation_items_insert') THEN
        CREATE POLICY accreditation_items_insert ON public.accreditation_items FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accreditation_items' AND policyname = 'accreditation_items_update') THEN
        CREATE POLICY accreditation_items_update ON public.accreditation_items FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accreditation_items' AND policyname = 'accreditation_items_delete') THEN
        CREATE POLICY accreditation_items_delete ON public.accreditation_items FOR DELETE USING (true);
    END IF;

    -- doctor_schedules
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doctor_schedules' AND policyname = 'doctor_schedules_select') THEN
        CREATE POLICY doctor_schedules_select ON public.doctor_schedules FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doctor_schedules' AND policyname = 'doctor_schedules_insert') THEN
        CREATE POLICY doctor_schedules_insert ON public.doctor_schedules FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doctor_schedules' AND policyname = 'doctor_schedules_update') THEN
        CREATE POLICY doctor_schedules_update ON public.doctor_schedules FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doctor_schedules' AND policyname = 'doctor_schedules_delete') THEN
        CREATE POLICY doctor_schedules_delete ON public.doctor_schedules FOR DELETE USING (true);
    END IF;

    -- doctor_facility_assignments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doctor_facility_assignments' AND policyname = 'doctor_facility_assignments_select') THEN
        CREATE POLICY doctor_facility_assignments_select ON public.doctor_facility_assignments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doctor_facility_assignments' AND policyname = 'doctor_facility_assignments_insert') THEN
        CREATE POLICY doctor_facility_assignments_insert ON public.doctor_facility_assignments FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doctor_facility_assignments' AND policyname = 'doctor_facility_assignments_update') THEN
        CREATE POLICY doctor_facility_assignments_update ON public.doctor_facility_assignments FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doctor_facility_assignments' AND policyname = 'doctor_facility_assignments_delete') THEN
        CREATE POLICY doctor_facility_assignments_delete ON public.doctor_facility_assignments FOR DELETE USING (true);
    END IF;

    -- shifts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shifts' AND policyname = 'shifts_select') THEN
        CREATE POLICY shifts_select ON public.shifts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shifts' AND policyname = 'shifts_insert') THEN
        CREATE POLICY shifts_insert ON public.shifts FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shifts' AND policyname = 'shifts_update') THEN
        CREATE POLICY shifts_update ON public.shifts FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shifts' AND policyname = 'shifts_delete') THEN
        CREATE POLICY shifts_delete ON public.shifts FOR DELETE USING (true);
    END IF;

    -- staff_shift_assignments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_shift_assignments' AND policyname = 'staff_shift_assignments_select') THEN
        CREATE POLICY staff_shift_assignments_select ON public.staff_shift_assignments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_shift_assignments' AND policyname = 'staff_shift_assignments_insert') THEN
        CREATE POLICY staff_shift_assignments_insert ON public.staff_shift_assignments FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_shift_assignments' AND policyname = 'staff_shift_assignments_update') THEN
        CREATE POLICY staff_shift_assignments_update ON public.staff_shift_assignments FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_shift_assignments' AND policyname = 'staff_shift_assignments_delete') THEN
        CREATE POLICY staff_shift_assignments_delete ON public.staff_shift_assignments FOR DELETE USING (true);
    END IF;

    -- queue_status
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'queue_status' AND policyname = 'queue_status_select') THEN
        CREATE POLICY queue_status_select ON public.queue_status FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'queue_status' AND policyname = 'queue_status_insert') THEN
        CREATE POLICY queue_status_insert ON public.queue_status FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'queue_status' AND policyname = 'queue_status_update') THEN
        CREATE POLICY queue_status_update ON public.queue_status FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'queue_status' AND policyname = 'queue_status_delete') THEN
        CREATE POLICY queue_status_delete ON public.queue_status FOR DELETE USING (true);
    END IF;

    -- provider_revenue_splits
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'provider_revenue_splits' AND policyname = 'provider_revenue_splits_select') THEN
        CREATE POLICY provider_revenue_splits_select ON public.provider_revenue_splits FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'provider_revenue_splits' AND policyname = 'provider_revenue_splits_insert') THEN
        CREATE POLICY provider_revenue_splits_insert ON public.provider_revenue_splits FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'provider_revenue_splits' AND policyname = 'provider_revenue_splits_update') THEN
        CREATE POLICY provider_revenue_splits_update ON public.provider_revenue_splits FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'provider_revenue_splits' AND policyname = 'provider_revenue_splits_delete') THEN
        CREATE POLICY provider_revenue_splits_delete ON public.provider_revenue_splits FOR DELETE USING (true);
    END IF;

    -- patient_consents
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_consents' AND policyname = 'patient_consents_select') THEN
        CREATE POLICY patient_consents_select ON public.patient_consents FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_consents' AND policyname = 'patient_consents_insert') THEN
        CREATE POLICY patient_consents_insert ON public.patient_consents FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_consents' AND policyname = 'patient_consents_update') THEN
        CREATE POLICY patient_consents_update ON public.patient_consents FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_consents' AND policyname = 'patient_consents_delete') THEN
        CREATE POLICY patient_consents_delete ON public.patient_consents FOR DELETE USING (true);
    END IF;

    -- data_access_logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data_access_logs' AND policyname = 'data_access_logs_select') THEN
        CREATE POLICY data_access_logs_select ON public.data_access_logs FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data_access_logs' AND policyname = 'data_access_logs_insert') THEN
        CREATE POLICY data_access_logs_insert ON public.data_access_logs FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data_access_logs' AND policyname = 'data_access_logs_update') THEN
        CREATE POLICY data_access_logs_update ON public.data_access_logs FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data_access_logs' AND policyname = 'data_access_logs_delete') THEN
        CREATE POLICY data_access_logs_delete ON public.data_access_logs FOR DELETE USING (true);
    END IF;

    -- data_retention_policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data_retention_policies' AND policyname = 'data_retention_policies_select') THEN
        CREATE POLICY data_retention_policies_select ON public.data_retention_policies FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data_retention_policies' AND policyname = 'data_retention_policies_insert') THEN
        CREATE POLICY data_retention_policies_insert ON public.data_retention_policies FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data_retention_policies' AND policyname = 'data_retention_policies_update') THEN
        CREATE POLICY data_retention_policies_update ON public.data_retention_policies FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data_retention_policies' AND policyname = 'data_retention_policies_delete') THEN
        CREATE POLICY data_retention_policies_delete ON public.data_retention_policies FOR DELETE USING (true);
    END IF;
END $$;

-- ============================================================
-- GRANTS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_tax_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_tax_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_receipts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedure_consumables TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedure_consumables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_transfers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_transfers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_credentials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_credentials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ipc_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ipc_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_maintenance TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_maintenance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accreditation_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accreditation_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_schedules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_facility_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_facility_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_shift_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_shift_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue_status TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_revenue_splits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_revenue_splits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_consents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_consents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_access_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_access_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_retention_policies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_retention_policies TO authenticated;

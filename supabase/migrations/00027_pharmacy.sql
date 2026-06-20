-- Migration 00027: Pharmacy — Dispensing, Batch Tracking & Prescription Fulfillment
-- Closes the loop: Doctor prescribes → Pharmacist dispenses → Stock deducted

-- 1. INVENTORY BATCHES (lot/batch tracking for traceability — Rwanda FDA requirement)
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    received_date DATE DEFAULT CURRENT_DATE,
    cost_price NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. DISPENSATIONS (records each time a pharmacist dispenses medicine from a prescription)
CREATE TABLE IF NOT EXISTS public.dispensations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
    batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    medicine_name TEXT NOT NULL,
    quantity_dispensed INTEGER NOT NULL CHECK (quantity_dispensed > 0),
    dispensed_by UUID NOT NULL REFERENCES public.users(id),
    notes TEXT,
    dispensed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ADD DISPENSED FIELDS TO PRESCRIPTIONS
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS quantity_dispensed INTEGER DEFAULT 0;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS dispensed_status TEXT DEFAULT 'pending'
    CHECK (dispensed_status IN ('pending', 'partial', 'dispensed', 'cancelled'));

-- 4. ADD 'dispensed' TYPE TO INVENTORY TRANSACTIONS CHECK CONSTRAINT
ALTER TABLE public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_type_check;
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_type_check
    CHECK (type IN ('stock_in', 'stock_out', 'adjustment', 'expired', 'dispensed'));

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_inventory_batches_item ON public.inventory_batches(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_clinic ON public.inventory_batches(clinic_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON public.inventory_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_batch ON public.inventory_batches(batch_number);

CREATE INDEX IF NOT EXISTS idx_dispensations_clinic ON public.dispensations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_dispensations_prescription ON public.dispensations(prescription_id);
CREATE INDEX IF NOT EXISTS idx_dispensations_patient ON public.dispensations(patient_id);
CREATE INDEX IF NOT EXISTS idx_dispensations_consultation ON public.dispensations(consultation_id);
CREATE INDEX IF NOT EXISTS idx_dispensations_dispensed_at ON public.dispensations(dispensed_at DESC);

-- 6. RLS
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispensations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_batches' AND policyname = 'inventory_batches_select') THEN
        CREATE POLICY inventory_batches_select ON public.inventory_batches FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_batches' AND policyname = 'inventory_batches_insert') THEN
        CREATE POLICY inventory_batches_insert ON public.inventory_batches FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_batches' AND policyname = 'inventory_batches_update') THEN
        CREATE POLICY inventory_batches_update ON public.inventory_batches FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_batches' AND policyname = 'inventory_batches_delete') THEN
        CREATE POLICY inventory_batches_delete ON public.inventory_batches FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dispensations' AND policyname = 'dispensations_select') THEN
        CREATE POLICY dispensations_select ON public.dispensations FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dispensations' AND policyname = 'dispensations_insert') THEN
        CREATE POLICY dispensations_insert ON public.dispensations FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dispensations' AND policyname = 'dispensations_update') THEN
        CREATE POLICY dispensations_update ON public.dispensations FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dispensations' AND policyname = 'dispensations_delete') THEN
        CREATE POLICY dispensations_delete ON public.dispensations FOR DELETE USING (true);
    END IF;
END $$;

-- 7. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_batches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispensations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispensations TO authenticated;

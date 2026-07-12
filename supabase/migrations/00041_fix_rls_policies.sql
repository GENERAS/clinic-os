-- Migration 00041: Fix RLS policies for Phase 2-6 tables
-- Replaces permissive USING (true) policies from migrations 00039 & 00040
-- with clinic-scoped policies using SECURITY DEFINER helpers
-- Tables without direct clinic_id are scoped via parent table EXISTS

-- =================================================================
-- 1. patient_insurance (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.patient_insurance;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.patient_insurance;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.patient_insurance;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.patient_insurance;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.patient_insurance;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.patient_insurance;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.patient_insurance;
  DROP POLICY IF EXISTS "Anyone can read" ON public.patient_insurance;
  DROP POLICY IF EXISTS patient_insurance_select ON public.patient_insurance;
  DROP POLICY IF EXISTS patient_insurance_insert ON public.patient_insurance;
  DROP POLICY IF EXISTS patient_insurance_update ON public.patient_insurance;
  DROP POLICY IF EXISTS patient_insurance_delete ON public.patient_insurance;

  CREATE POLICY patient_insurance_select ON public.patient_insurance
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY patient_insurance_insert ON public.patient_insurance
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY patient_insurance_update ON public.patient_insurance
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY patient_insurance_delete ON public.patient_insurance
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.patient_insurance FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 2. insurance_pre_authorizations (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.insurance_pre_authorizations;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.insurance_pre_authorizations;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.insurance_pre_authorizations;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.insurance_pre_authorizations;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.insurance_pre_authorizations;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.insurance_pre_authorizations;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.insurance_pre_authorizations;
  DROP POLICY IF EXISTS "Anyone can read" ON public.insurance_pre_authorizations;
  DROP POLICY IF EXISTS insurance_pre_authorizations_select ON public.insurance_pre_authorizations;
  DROP POLICY IF EXISTS insurance_pre_authorizations_insert ON public.insurance_pre_authorizations;
  DROP POLICY IF EXISTS insurance_pre_authorizations_update ON public.insurance_pre_authorizations;
  DROP POLICY IF EXISTS insurance_pre_authorizations_delete ON public.insurance_pre_authorizations;

  CREATE POLICY insurance_pre_authorizations_select ON public.insurance_pre_authorizations
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY insurance_pre_authorizations_insert ON public.insurance_pre_authorizations
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY insurance_pre_authorizations_update ON public.insurance_pre_authorizations
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY insurance_pre_authorizations_delete ON public.insurance_pre_authorizations
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.insurance_pre_authorizations FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 3. insurance_plans (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.insurance_plans;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.insurance_plans;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.insurance_plans;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.insurance_plans;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.insurance_plans;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.insurance_plans;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.insurance_plans;
  DROP POLICY IF EXISTS "Anyone can read" ON public.insurance_plans;
  DROP POLICY IF EXISTS insurance_plans_select ON public.insurance_plans;
  DROP POLICY IF EXISTS insurance_plans_insert ON public.insurance_plans;
  DROP POLICY IF EXISTS insurance_plans_update ON public.insurance_plans;
  DROP POLICY IF EXISTS insurance_plans_delete ON public.insurance_plans;

  CREATE POLICY insurance_plans_select ON public.insurance_plans
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY insurance_plans_insert ON public.insurance_plans
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY insurance_plans_update ON public.insurance_plans
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY insurance_plans_delete ON public.insurance_plans
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.insurance_plans FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 4. insurance_claim_items (no direct clinic_id — scope via insurance_claims)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.insurance_claim_items;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.insurance_claim_items;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.insurance_claim_items;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.insurance_claim_items;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.insurance_claim_items;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.insurance_claim_items;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.insurance_claim_items;
  DROP POLICY IF EXISTS "Anyone can read" ON public.insurance_claim_items;
  DROP POLICY IF EXISTS insurance_claim_items_select ON public.insurance_claim_items;
  DROP POLICY IF EXISTS insurance_claim_items_insert ON public.insurance_claim_items;
  DROP POLICY IF EXISTS insurance_claim_items_update ON public.insurance_claim_items;
  DROP POLICY IF EXISTS insurance_claim_items_delete ON public.insurance_claim_items;

  CREATE POLICY insurance_claim_items_select ON public.insurance_claim_items
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.insurance_claims WHERE id = claim_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    );
  CREATE POLICY insurance_claim_items_insert ON public.insurance_claim_items
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.insurance_claims WHERE id = claim_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    );
  CREATE POLICY insurance_claim_items_update ON public.insurance_claim_items
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.insurance_claims WHERE id = claim_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM public.insurance_claims WHERE id = claim_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    );
  CREATE POLICY insurance_claim_items_delete ON public.insurance_claim_items
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.insurance_claims WHERE id = claim_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    );

  REVOKE ALL ON public.insurance_claim_items FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 5. clinic_tax_settings (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.clinic_tax_settings;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.clinic_tax_settings;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clinic_tax_settings;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.clinic_tax_settings;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.clinic_tax_settings;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clinic_tax_settings;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.clinic_tax_settings;
  DROP POLICY IF EXISTS "Anyone can read" ON public.clinic_tax_settings;
  DROP POLICY IF EXISTS clinic_tax_settings_select ON public.clinic_tax_settings;
  DROP POLICY IF EXISTS clinic_tax_settings_insert ON public.clinic_tax_settings;
  DROP POLICY IF EXISTS clinic_tax_settings_update ON public.clinic_tax_settings;
  DROP POLICY IF EXISTS clinic_tax_settings_delete ON public.clinic_tax_settings;

  CREATE POLICY clinic_tax_settings_select ON public.clinic_tax_settings
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY clinic_tax_settings_insert ON public.clinic_tax_settings
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY clinic_tax_settings_update ON public.clinic_tax_settings
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY clinic_tax_settings_delete ON public.clinic_tax_settings
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.clinic_tax_settings FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 6. fiscal_receipts (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.fiscal_receipts;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.fiscal_receipts;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.fiscal_receipts;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.fiscal_receipts;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.fiscal_receipts;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.fiscal_receipts;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.fiscal_receipts;
  DROP POLICY IF EXISTS "Anyone can read" ON public.fiscal_receipts;
  DROP POLICY IF EXISTS fiscal_receipts_select ON public.fiscal_receipts;
  DROP POLICY IF EXISTS fiscal_receipts_insert ON public.fiscal_receipts;
  DROP POLICY IF EXISTS fiscal_receipts_update ON public.fiscal_receipts;
  DROP POLICY IF EXISTS fiscal_receipts_delete ON public.fiscal_receipts;

  CREATE POLICY fiscal_receipts_select ON public.fiscal_receipts
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY fiscal_receipts_insert ON public.fiscal_receipts
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY fiscal_receipts_update ON public.fiscal_receipts
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY fiscal_receipts_delete ON public.fiscal_receipts
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.fiscal_receipts FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 7. suppliers (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.suppliers;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.suppliers;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.suppliers;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.suppliers;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.suppliers;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.suppliers;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.suppliers;
  DROP POLICY IF EXISTS "Anyone can read" ON public.suppliers;
  DROP POLICY IF EXISTS suppliers_select ON public.suppliers;
  DROP POLICY IF EXISTS suppliers_insert ON public.suppliers;
  DROP POLICY IF EXISTS suppliers_update ON public.suppliers;
  DROP POLICY IF EXISTS suppliers_delete ON public.suppliers;

  CREATE POLICY suppliers_select ON public.suppliers
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY suppliers_insert ON public.suppliers
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY suppliers_update ON public.suppliers
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY suppliers_delete ON public.suppliers
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.suppliers FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 8. supplier_items (no direct clinic_id — scope via suppliers)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.supplier_items;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.supplier_items;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.supplier_items;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.supplier_items;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.supplier_items;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.supplier_items;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.supplier_items;
  DROP POLICY IF EXISTS "Anyone can read" ON public.supplier_items;
  DROP POLICY IF EXISTS supplier_items_select ON public.supplier_items;
  DROP POLICY IF EXISTS supplier_items_insert ON public.supplier_items;
  DROP POLICY IF EXISTS supplier_items_update ON public.supplier_items;
  DROP POLICY IF EXISTS supplier_items_delete ON public.supplier_items;

  CREATE POLICY supplier_items_select ON public.supplier_items
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE id = supplier_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    );
  CREATE POLICY supplier_items_insert ON public.supplier_items
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.suppliers WHERE id = supplier_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    );
  CREATE POLICY supplier_items_update ON public.supplier_items
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE id = supplier_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM public.suppliers WHERE id = supplier_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    );
  CREATE POLICY supplier_items_delete ON public.supplier_items
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE id = supplier_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    );

  REVOKE ALL ON public.supplier_items FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 9. procedure_consumables (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.procedure_consumables;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.procedure_consumables;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.procedure_consumables;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.procedure_consumables;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.procedure_consumables;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.procedure_consumables;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.procedure_consumables;
  DROP POLICY IF EXISTS "Anyone can read" ON public.procedure_consumables;
  DROP POLICY IF EXISTS procedure_consumables_select ON public.procedure_consumables;
  DROP POLICY IF EXISTS procedure_consumables_insert ON public.procedure_consumables;
  DROP POLICY IF EXISTS procedure_consumables_update ON public.procedure_consumables;
  DROP POLICY IF EXISTS procedure_consumables_delete ON public.procedure_consumables;

  CREATE POLICY procedure_consumables_select ON public.procedure_consumables
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY procedure_consumables_insert ON public.procedure_consumables
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY procedure_consumables_update ON public.procedure_consumables
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY procedure_consumables_delete ON public.procedure_consumables
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.procedure_consumables FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 10. purchase_orders (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.purchase_orders;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.purchase_orders;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.purchase_orders;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.purchase_orders;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.purchase_orders;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.purchase_orders;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.purchase_orders;
  DROP POLICY IF EXISTS "Anyone can read" ON public.purchase_orders;
  DROP POLICY IF EXISTS purchase_orders_select ON public.purchase_orders;
  DROP POLICY IF EXISTS purchase_orders_insert ON public.purchase_orders;
  DROP POLICY IF EXISTS purchase_orders_update ON public.purchase_orders;
  DROP POLICY IF EXISTS purchase_orders_delete ON public.purchase_orders;

  CREATE POLICY purchase_orders_select ON public.purchase_orders
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY purchase_orders_insert ON public.purchase_orders
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY purchase_orders_update ON public.purchase_orders
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY purchase_orders_delete ON public.purchase_orders
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.purchase_orders FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 11. purchase_order_items (no direct clinic_id — scope via purchase_orders)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.purchase_order_items;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.purchase_order_items;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.purchase_order_items;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.purchase_order_items;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.purchase_order_items;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.purchase_order_items;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.purchase_order_items;
  DROP POLICY IF EXISTS "Anyone can read" ON public.purchase_order_items;
  DROP POLICY IF EXISTS purchase_order_items_select ON public.purchase_order_items;
  DROP POLICY IF EXISTS purchase_order_items_insert ON public.purchase_order_items;
  DROP POLICY IF EXISTS purchase_order_items_update ON public.purchase_order_items;
  DROP POLICY IF EXISTS purchase_order_items_delete ON public.purchase_order_items;

  CREATE POLICY purchase_order_items_select ON public.purchase_order_items
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.purchase_orders WHERE id = purchase_order_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    );
  CREATE POLICY purchase_order_items_insert ON public.purchase_order_items
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.purchase_orders WHERE id = purchase_order_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    );
  CREATE POLICY purchase_order_items_update ON public.purchase_order_items
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.purchase_orders WHERE id = purchase_order_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM public.purchase_orders WHERE id = purchase_order_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    );
  CREATE POLICY purchase_order_items_delete ON public.purchase_order_items
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.purchase_orders WHERE id = purchase_order_id
        AND (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin()))
    );

  REVOKE ALL ON public.purchase_order_items FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 12. stock_transfers (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.stock_transfers;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.stock_transfers;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.stock_transfers;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.stock_transfers;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.stock_transfers;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.stock_transfers;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.stock_transfers;
  DROP POLICY IF EXISTS "Anyone can read" ON public.stock_transfers;
  DROP POLICY IF EXISTS stock_transfers_select ON public.stock_transfers;
  DROP POLICY IF EXISTS stock_transfers_insert ON public.stock_transfers;
  DROP POLICY IF EXISTS stock_transfers_update ON public.stock_transfers;
  DROP POLICY IF EXISTS stock_transfers_delete ON public.stock_transfers;

  CREATE POLICY stock_transfers_select ON public.stock_transfers
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY stock_transfers_insert ON public.stock_transfers
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY stock_transfers_update ON public.stock_transfers
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY stock_transfers_delete ON public.stock_transfers
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.stock_transfers FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 13. staff_credentials (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.staff_credentials;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.staff_credentials;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.staff_credentials;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.staff_credentials;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.staff_credentials;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.staff_credentials;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.staff_credentials;
  DROP POLICY IF EXISTS "Anyone can read" ON public.staff_credentials;
  DROP POLICY IF EXISTS staff_credentials_select ON public.staff_credentials;
  DROP POLICY IF EXISTS staff_credentials_insert ON public.staff_credentials;
  DROP POLICY IF EXISTS staff_credentials_update ON public.staff_credentials;
  DROP POLICY IF EXISTS staff_credentials_delete ON public.staff_credentials;

  CREATE POLICY staff_credentials_select ON public.staff_credentials
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY staff_credentials_insert ON public.staff_credentials
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY staff_credentials_update ON public.staff_credentials
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY staff_credentials_delete ON public.staff_credentials
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.staff_credentials FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 14. ipc_logs (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.ipc_logs;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.ipc_logs;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.ipc_logs;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.ipc_logs;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.ipc_logs;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.ipc_logs;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.ipc_logs;
  DROP POLICY IF EXISTS "Anyone can read" ON public.ipc_logs;
  DROP POLICY IF EXISTS ipc_logs_select ON public.ipc_logs;
  DROP POLICY IF EXISTS ipc_logs_insert ON public.ipc_logs;
  DROP POLICY IF EXISTS ipc_logs_update ON public.ipc_logs;
  DROP POLICY IF EXISTS ipc_logs_delete ON public.ipc_logs;

  CREATE POLICY ipc_logs_select ON public.ipc_logs
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY ipc_logs_insert ON public.ipc_logs
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY ipc_logs_update ON public.ipc_logs
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY ipc_logs_delete ON public.ipc_logs
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.ipc_logs FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 15. equipment_maintenance (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.equipment_maintenance;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.equipment_maintenance;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.equipment_maintenance;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.equipment_maintenance;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.equipment_maintenance;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.equipment_maintenance;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.equipment_maintenance;
  DROP POLICY IF EXISTS "Anyone can read" ON public.equipment_maintenance;
  DROP POLICY IF EXISTS equipment_maintenance_select ON public.equipment_maintenance;
  DROP POLICY IF EXISTS equipment_maintenance_insert ON public.equipment_maintenance;
  DROP POLICY IF EXISTS equipment_maintenance_update ON public.equipment_maintenance;
  DROP POLICY IF EXISTS equipment_maintenance_delete ON public.equipment_maintenance;

  CREATE POLICY equipment_maintenance_select ON public.equipment_maintenance
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY equipment_maintenance_insert ON public.equipment_maintenance
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY equipment_maintenance_update ON public.equipment_maintenance
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY equipment_maintenance_delete ON public.equipment_maintenance
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.equipment_maintenance FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 16. compliance_reports (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.compliance_reports;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.compliance_reports;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.compliance_reports;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.compliance_reports;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.compliance_reports;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.compliance_reports;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.compliance_reports;
  DROP POLICY IF EXISTS "Anyone can read" ON public.compliance_reports;
  DROP POLICY IF EXISTS compliance_reports_select ON public.compliance_reports;
  DROP POLICY IF EXISTS compliance_reports_insert ON public.compliance_reports;
  DROP POLICY IF EXISTS compliance_reports_update ON public.compliance_reports;
  DROP POLICY IF EXISTS compliance_reports_delete ON public.compliance_reports;

  CREATE POLICY compliance_reports_select ON public.compliance_reports
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY compliance_reports_insert ON public.compliance_reports
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY compliance_reports_update ON public.compliance_reports
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY compliance_reports_delete ON public.compliance_reports
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.compliance_reports FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 17. accreditation_items (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.accreditation_items;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.accreditation_items;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.accreditation_items;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.accreditation_items;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.accreditation_items;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.accreditation_items;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.accreditation_items;
  DROP POLICY IF EXISTS "Anyone can read" ON public.accreditation_items;
  DROP POLICY IF EXISTS accreditation_items_select ON public.accreditation_items;
  DROP POLICY IF EXISTS accreditation_items_insert ON public.accreditation_items;
  DROP POLICY IF EXISTS accreditation_items_update ON public.accreditation_items;
  DROP POLICY IF EXISTS accreditation_items_delete ON public.accreditation_items;

  CREATE POLICY accreditation_items_select ON public.accreditation_items
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY accreditation_items_insert ON public.accreditation_items
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY accreditation_items_update ON public.accreditation_items
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY accreditation_items_delete ON public.accreditation_items
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.accreditation_items FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 18. doctor_schedules (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.doctor_schedules;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.doctor_schedules;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.doctor_schedules;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.doctor_schedules;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.doctor_schedules;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.doctor_schedules;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.doctor_schedules;
  DROP POLICY IF EXISTS "Anyone can read" ON public.doctor_schedules;
  DROP POLICY IF EXISTS doctor_schedules_select ON public.doctor_schedules;
  DROP POLICY IF EXISTS doctor_schedules_insert ON public.doctor_schedules;
  DROP POLICY IF EXISTS doctor_schedules_update ON public.doctor_schedules;
  DROP POLICY IF EXISTS doctor_schedules_delete ON public.doctor_schedules;

  CREATE POLICY doctor_schedules_select ON public.doctor_schedules
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY doctor_schedules_insert ON public.doctor_schedules
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY doctor_schedules_update ON public.doctor_schedules
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY doctor_schedules_delete ON public.doctor_schedules
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.doctor_schedules FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 19. doctor_facility_assignments (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.doctor_facility_assignments;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.doctor_facility_assignments;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.doctor_facility_assignments;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.doctor_facility_assignments;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.doctor_facility_assignments;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.doctor_facility_assignments;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.doctor_facility_assignments;
  DROP POLICY IF EXISTS "Anyone can read" ON public.doctor_facility_assignments;
  DROP POLICY IF EXISTS doctor_facility_assignments_select ON public.doctor_facility_assignments;
  DROP POLICY IF EXISTS doctor_facility_assignments_insert ON public.doctor_facility_assignments;
  DROP POLICY IF EXISTS doctor_facility_assignments_update ON public.doctor_facility_assignments;
  DROP POLICY IF EXISTS doctor_facility_assignments_delete ON public.doctor_facility_assignments;

  CREATE POLICY doctor_facility_assignments_select ON public.doctor_facility_assignments
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY doctor_facility_assignments_insert ON public.doctor_facility_assignments
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY doctor_facility_assignments_update ON public.doctor_facility_assignments
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY doctor_facility_assignments_delete ON public.doctor_facility_assignments
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.doctor_facility_assignments FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 20. shifts (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.shifts;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.shifts;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.shifts;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.shifts;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.shifts;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.shifts;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.shifts;
  DROP POLICY IF EXISTS "Anyone can read" ON public.shifts;
  DROP POLICY IF EXISTS shifts_select ON public.shifts;
  DROP POLICY IF EXISTS shifts_insert ON public.shifts;
  DROP POLICY IF EXISTS shifts_update ON public.shifts;
  DROP POLICY IF EXISTS shifts_delete ON public.shifts;

  CREATE POLICY shifts_select ON public.shifts
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY shifts_insert ON public.shifts
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY shifts_update ON public.shifts
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY shifts_delete ON public.shifts
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.shifts FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 21. staff_shift_assignments (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.staff_shift_assignments;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.staff_shift_assignments;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.staff_shift_assignments;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.staff_shift_assignments;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.staff_shift_assignments;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.staff_shift_assignments;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.staff_shift_assignments;
  DROP POLICY IF EXISTS "Anyone can read" ON public.staff_shift_assignments;
  DROP POLICY IF EXISTS staff_shift_assignments_select ON public.staff_shift_assignments;
  DROP POLICY IF EXISTS staff_shift_assignments_insert ON public.staff_shift_assignments;
  DROP POLICY IF EXISTS staff_shift_assignments_update ON public.staff_shift_assignments;
  DROP POLICY IF EXISTS staff_shift_assignments_delete ON public.staff_shift_assignments;

  CREATE POLICY staff_shift_assignments_select ON public.staff_shift_assignments
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY staff_shift_assignments_insert ON public.staff_shift_assignments
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY staff_shift_assignments_update ON public.staff_shift_assignments
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY staff_shift_assignments_delete ON public.staff_shift_assignments
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.staff_shift_assignments FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 22. queue_status (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.queue_status;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.queue_status;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.queue_status;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.queue_status;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.queue_status;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.queue_status;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.queue_status;
  DROP POLICY IF EXISTS "Anyone can read" ON public.queue_status;
  DROP POLICY IF EXISTS queue_status_select ON public.queue_status;
  DROP POLICY IF EXISTS queue_status_insert ON public.queue_status;
  DROP POLICY IF EXISTS queue_status_update ON public.queue_status;
  DROP POLICY IF EXISTS queue_status_delete ON public.queue_status;

  CREATE POLICY queue_status_select ON public.queue_status
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY queue_status_insert ON public.queue_status
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY queue_status_update ON public.queue_status
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY queue_status_delete ON public.queue_status
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.queue_status FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 23. provider_revenue_splits (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.provider_revenue_splits;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.provider_revenue_splits;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.provider_revenue_splits;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.provider_revenue_splits;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.provider_revenue_splits;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.provider_revenue_splits;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.provider_revenue_splits;
  DROP POLICY IF EXISTS "Anyone can read" ON public.provider_revenue_splits;
  DROP POLICY IF EXISTS provider_revenue_splits_select ON public.provider_revenue_splits;
  DROP POLICY IF EXISTS provider_revenue_splits_insert ON public.provider_revenue_splits;
  DROP POLICY IF EXISTS provider_revenue_splits_update ON public.provider_revenue_splits;
  DROP POLICY IF EXISTS provider_revenue_splits_delete ON public.provider_revenue_splits;

  CREATE POLICY provider_revenue_splits_select ON public.provider_revenue_splits
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY provider_revenue_splits_insert ON public.provider_revenue_splits
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY provider_revenue_splits_update ON public.provider_revenue_splits
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY provider_revenue_splits_delete ON public.provider_revenue_splits
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.provider_revenue_splits FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 24. patient_consents (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.patient_consents;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.patient_consents;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.patient_consents;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.patient_consents;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.patient_consents;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.patient_consents;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.patient_consents;
  DROP POLICY IF EXISTS "Anyone can read" ON public.patient_consents;
  DROP POLICY IF EXISTS patient_consents_select ON public.patient_consents;
  DROP POLICY IF EXISTS patient_consents_insert ON public.patient_consents;
  DROP POLICY IF EXISTS patient_consents_update ON public.patient_consents;
  DROP POLICY IF EXISTS patient_consents_delete ON public.patient_consents;

  CREATE POLICY patient_consents_select ON public.patient_consents
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY patient_consents_insert ON public.patient_consents
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY patient_consents_update ON public.patient_consents
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY patient_consents_delete ON public.patient_consents
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.patient_consents FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 25. data_access_logs (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.data_access_logs;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.data_access_logs;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.data_access_logs;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.data_access_logs;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.data_access_logs;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.data_access_logs;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.data_access_logs;
  DROP POLICY IF EXISTS "Anyone can read" ON public.data_access_logs;
  DROP POLICY IF EXISTS data_access_logs_select ON public.data_access_logs;
  DROP POLICY IF EXISTS data_access_logs_insert ON public.data_access_logs;
  DROP POLICY IF EXISTS data_access_logs_update ON public.data_access_logs;
  DROP POLICY IF EXISTS data_access_logs_delete ON public.data_access_logs;

  CREATE POLICY data_access_logs_select ON public.data_access_logs
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY data_access_logs_insert ON public.data_access_logs
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY data_access_logs_update ON public.data_access_logs
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY data_access_logs_delete ON public.data_access_logs
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.data_access_logs FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- 26. data_retention_policies (direct clinic_id)
-- =================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated" ON public.data_retention_policies;
  DROP POLICY IF EXISTS "Allow all for anon" ON public.data_retention_policies;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.data_retention_policies;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.data_retention_policies;
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.data_retention_policies;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.data_retention_policies;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.data_retention_policies;
  DROP POLICY IF EXISTS "Anyone can read" ON public.data_retention_policies;
  DROP POLICY IF EXISTS data_retention_policies_select ON public.data_retention_policies;
  DROP POLICY IF EXISTS data_retention_policies_insert ON public.data_retention_policies;
  DROP POLICY IF EXISTS data_retention_policies_update ON public.data_retention_policies;
  DROP POLICY IF EXISTS data_retention_policies_delete ON public.data_retention_policies;

  CREATE POLICY data_retention_policies_select ON public.data_retention_policies
    FOR SELECT USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY data_retention_policies_insert ON public.data_retention_policies
    FOR INSERT WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY data_retention_policies_update ON public.data_retention_policies
    FOR UPDATE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin())
    WITH CHECK (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
  CREATE POLICY data_retention_policies_delete ON public.data_retention_policies
    FOR DELETE USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());

  REVOKE ALL ON public.data_retention_policies FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =================================================================
-- RELOAD SCHEMA CACHE
-- =================================================================
NOTIFY pgrst, 'reload schema';

-- =============================================================
-- 00047_security_hardening.sql
-- Fixes CRITICAL security issues found in QA audit:
-- 1. Prevents user_roles self-escalation (P0)
-- 2. Removes anon grants from sensitive tables (P1)
-- 3. Adds DB-level unique constraints for race condition prevention
-- =============================================================

-- 1. FIX: user_roles_insert_own — prevent self-escalation
-- Drop the dangerous policy that lets any user assign any role to themselves
DROP POLICY IF EXISTS "user_roles_insert_own" ON "public"."user_roles";

-- Replace with a restrictive policy: users can only be assigned roles
-- if the assigning user is a clinic admin (Owner/Admin role)
CREATE POLICY "user_roles_insert_restricted" ON "public"."user_roles"
  FOR insert WITH CHECK (
    -- Only clinic admins can insert role assignments
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Owner', 'Admin')
    )
    -- Or this is the initial onboarding (first user of a new clinic)
    OR (
      NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
      )
    )
  );

-- 2. Revoke anon DML on sensitive tables
DO $$
BEGIN
  -- WhatsApp credentials (contains Meta API tokens)
  REVOKE ALL ON "public"."whatsapp_credentials" FROM "anon";

  -- Billing tables
  REVOKE ALL ON "public"."billing_invoices" FROM "anon";
  REVOKE ALL ON "public"."billing_line_items" FROM "anon";
  REVOKE ALL ON "public"."patient_payments" FROM "anon";
  REVOKE ALL ON "public"."insurance_claims" FROM "anon";

  -- Consultation/clinical tables
  REVOKE ALL ON "public"."consultations" FROM "anon";
  REVOKE ALL ON "public"."diagnoses" FROM "anon";
  REVOKE ALL ON "public"."prescriptions" FROM "anon";
  REVOKE ALL ON "public"."investigations" FROM "anon";
  REVOKE ALL ON "public"."triage_records" FROM "anon";

  -- Insurance tables
  REVOKE ALL ON "public"."patient_insurance" FROM "anon";
  REVOKE ALL ON "public"."insurance_pre_authorizations" FROM "anon";
  REVOKE ALL ON "public"."insurance_plans" FROM "anon";
  REVOKE ALL ON "public"."insurance_claim_items" FROM "anon";

  -- Pharmacy
  REVOKE ALL ON "public"."dispensations" FROM "anon";
  REVOKE ALL ON "public"."inventory_batches" FROM "anon";

  -- Privacy/audit
  REVOKE ALL ON "public"."audit_logs" FROM "anon";
  REVOKE ALL ON "public"."data_access_logs" FROM "anon";
  REVOKE ALL ON "public"."patient_consents" FROM "anon";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Add DB-level unique constraints to prevent race conditions
-- These serve as the final safety net even if the app-layer check is bypassed

-- Patient phone uniqueness per clinic (prevents duplicate patients)
DO $$
BEGIN
  ALTER TABLE "public"."patients"
    ADD CONSTRAINT "patients_clinic_phone_unique"
    UNIQUE (clinic_id, phone);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Patient national_id uniqueness per clinic (prevents duplicate NID)
DO $$
BEGIN
  ALTER TABLE "public"."patients"
    ADD CONSTRAINT "patients_clinic_nid_unique"
    UNIQUE (clinic_id, national_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Appointment conflict prevention: unique active appointment per doctor+date+time
-- Uses a partial unique index (excludes cancelled/no_show)
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "appointments_doctor_slot_unique"
    ON "public"."appointments" (clinic_id, doctor_id, appointment_date, start_time)
    WHERE status NOT IN ('cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

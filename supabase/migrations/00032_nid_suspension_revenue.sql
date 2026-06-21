-- Migration 00032: NID field, suspended status, revenue_recovery table
-- Safe to run repeatedly (IF NOT EXISTS / IF EXISTS)

-- 1. Add national_id to patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS national_id text;
CREATE INDEX IF NOT EXISTS idx_patients_national_id ON public.patients(national_id);

-- 2. Add 'suspended' to subscriptions status check
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired', 'suspended'));

-- 3. Create revenue_recovery table for lost revenue tracking
CREATE TABLE IF NOT EXISTS public.revenue_recovery (
    id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id       uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    appointment_id  uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
    patient_id      uuid REFERENCES public.patients(id) ON DELETE SET NULL,
    lost_revenue    numeric(10,2) NOT NULL DEFAULT 0,
    currency        text NOT NULL DEFAULT 'RWF',
    reason          text NOT NULL DEFAULT 'cancellation',
    cancelled_at    timestamptz NOT NULL DEFAULT now(),
    recovered       boolean NOT NULL DEFAULT false,
    recovered_at    timestamptz,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_recovery ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='revenue_recovery' AND policyname='revenue_recovery_select_same_clinic') THEN
        CREATE POLICY "revenue_recovery_select_same_clinic" ON public.revenue_recovery
            FOR SELECT TO public USING (clinic_id = (SELECT users.clinic_id FROM users WHERE users.id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='revenue_recovery' AND policyname='revenue_recovery_insert_same_clinic') THEN
        CREATE POLICY "revenue_recovery_insert_same_clinic" ON public.revenue_recovery
            FOR INSERT TO public WITH CHECK (clinic_id = (SELECT users.clinic_id FROM users WHERE users.id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='revenue_recovery' AND policyname='revenue_recovery_super_admin_all') THEN
        CREATE POLICY "revenue_recovery_super_admin_all" ON public.revenue_recovery
            FOR ALL TO authenticated USING (public.is_super_admin());
    END IF;
END $$;

-- 4. Try to schedule the billing cron via pg_cron (soft failure if not available)
DO $$ BEGIN
    -- Remove old schedule if exists
    PERFORM cron.unschedule('billing-daily-cron');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$ BEGIN
    PERFORM cron.schedule('billing-daily-cron', '0 6 * * *', $$
        SELECT net.http_post(
            url := current_setting('app.settings.supabase_url') || '/functions/v1/billing-cron',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
            ),
            body := '{}'
        ) AS request_id;
    $$);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

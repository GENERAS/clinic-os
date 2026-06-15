-- Subscription v2: Payment methods, payments, invoices, grace period, reminders
-- Safe to run repeatedly (IF NOT EXISTS / IF EXISTS)

-- 1. Payment methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name          text NOT NULL UNIQUE,
    slug          text NOT NULL UNIQUE,
    description   text,
    instructions  text,
    is_active     boolean NOT NULL DEFAULT true,
    sort_order    integer NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.payment_methods (name, slug, description, instructions, sort_order) VALUES
  ('MTN Mobile Money', 'mtn-momo', 'Pay via MTN Mobile Money', 'Send payment to MTN MoMo number: 0788 123 456', 1),
  ('Airtel Money', 'airtel-money', 'Pay via Airtel Money', 'Send payment to Airtel Money number: 0783 123 456', 2),
  ('Bank Transfer', 'bank-transfer', 'Direct bank transfer', 'Bank: Bank of Kigali\nAccount Name: ClinicOS Ltd\nAccount Number: 1000001234567\nBranch: Kigali Main', 3),
  ('Cash', 'cash', 'Pay in cash at our office', 'Visit our office at KG 123 St, Kigali to pay in cash.', 4)
ON CONFLICT (name) DO NOTHING;

-- 2. Payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id                  uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id           uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    subscription_id     uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    amount              numeric(10,2) NOT NULL,
    currency            text NOT NULL DEFAULT 'RWF',
    payment_method      text NOT NULL,
    transaction_reference text,
    payer_name          text,
    payer_phone         text,
    proof_url           text,
    notes               text,
    status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    rejection_reason    text,
    submitted_at        timestamptz NOT NULL DEFAULT now(),
    verified_at         timestamptz,
    verified_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 3. Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id       uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    payment_id      uuid REFERENCES public.payments(id) ON DELETE SET NULL,
    invoice_number  text NOT NULL UNIQUE,
    plan_name       text,
    amount          numeric(10,2) NOT NULL,
    currency        text NOT NULL DEFAULT 'RWF',
    status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    issued_at       timestamptz NOT NULL DEFAULT now(),
    paid_at         timestamptz,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- 4. Add grace_period_ends_at and renewal_date to subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS renewal_date timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS days_remaining integer GENERATED ALWAYS AS (
    CASE
        WHEN current_period_end IS NOT NULL THEN
            GREATEST(0, EXTRACT(DAY FROM (current_period_end - now())))
        ELSE 0
    END
) STORED;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false;

-- 5. Function: auto-create trial subscription for new clinic
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS trigger AS $$
DECLARE
    trial_plan_id uuid;
BEGIN
    SELECT id INTO trial_plan_id FROM public.plans WHERE slug = 'free' LIMIT 1;
    IF trial_plan_id IS NULL THEN
        RETURN NEW;
    END IF;
    INSERT INTO public.subscriptions (
        clinic_id,
        plan_id,
        status,
        billing_cycle,
        trial_ends_at,
        current_period_start,
        current_period_end,
        grace_period_ends_at,
        trial_used,
        metadata
    ) VALUES (
        NEW.id,
        trial_plan_id,
        'trialing',
        'monthly',
        now() + INTERVAL '14 days',
        now(),
        now() + INTERVAL '14 days',
        now() + INTERVAL '21 days',
        true,
        '{"trial_days": 14}'::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_trial_subscription ON public.clinics;
CREATE TRIGGER trg_create_trial_subscription
    AFTER INSERT ON public.clinics
    FOR EACH ROW
    EXECUTE FUNCTION public.create_trial_subscription();

-- 6. Function: auto-generate invoice number
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text AS $$
DECLARE
    seq_val bigint;
    year_str text;
BEGIN
    year_str := to_char(now(), 'YYYY');
    seq_val := nextval('public.invoice_number_seq');
    RETURN 'INV-' || year_str || '-' || LPAD(seq_val::text, 5, '0');
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 7. Function: verify payment and activate subscription
CREATE OR REPLACE FUNCTION public.verify_payment(
    p_payment_id uuid,
    p_verified_by uuid
)
RETURNS void AS $$
DECLARE
    v_payment public.payments;
    v_subscription public.subscriptions;
    v_invoice_number text;
BEGIN
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
    IF v_payment IS NULL THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    IF v_payment.status != 'pending' THEN
        RAISE EXCEPTION 'Payment is not pending';
    END IF;

    UPDATE public.payments SET
        status = 'verified',
        verified_at = now(),
        verified_by = p_verified_by,
        updated_at = now()
    WHERE id = p_payment_id;

    UPDATE public.subscriptions SET
        status = 'active',
        current_period_start = now(),
        current_period_end = CASE
            WHEN billing_cycle = 'yearly' THEN now() + INTERVAL '1 year'
            ELSE now() + INTERVAL '30 days'
        END,
        grace_period_ends_at = CASE
            WHEN billing_cycle = 'yearly' THEN now() + INTERVAL '1 year' + INTERVAL '7 days'
            ELSE now() + INTERVAL '30 days' + INTERVAL '7 days'
        END,
        renewal_date = CASE
            WHEN billing_cycle = 'yearly' THEN now() + INTERVAL '1 year'
            ELSE now() + INTERVAL '30 days'
        END,
        updated_at = now()
    WHERE id = v_payment.subscription_id
    RETURNING * INTO v_subscription;

    v_invoice_number := public.generate_invoice_number();
    INSERT INTO public.invoices (
        clinic_id,
        subscription_id,
        payment_id,
        invoice_number,
        plan_name,
        amount,
        currency,
        status,
        issued_at,
        paid_at
    ) VALUES (
        v_payment.clinic_id,
        v_payment.subscription_id,
        v_payment.id,
        v_invoice_number,
        (SELECT name FROM public.plans WHERE id = v_subscription.plan_id),
        v_payment.amount,
        v_payment.currency,
        'paid',
        now(),
        now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function: reject payment
CREATE OR REPLACE FUNCTION public.reject_payment(
    p_payment_id uuid,
    p_verified_by uuid,
    p_reason text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE public.payments SET
        status = 'rejected',
        rejection_reason = p_reason,
        verified_at = now(),
        verified_by = p_verified_by,
        updated_at = now()
    WHERE id = p_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RLS: payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_methods' AND policyname='payment_methods_select_all') THEN
        CREATE POLICY "payment_methods_select_all" ON public.payment_methods FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_methods' AND policyname='payment_methods_super_admin_all') THEN
        CREATE POLICY "payment_methods_super_admin_all" ON public.payment_methods FOR ALL TO authenticated USING (public.is_super_admin());
    END IF;
END $$;

-- 10. RLS: payments
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='payments_select_same_clinic') THEN
        CREATE POLICY "payments_select_same_clinic" ON public.payments FOR SELECT TO public USING (clinic_id = (SELECT users.clinic_id FROM users WHERE users.id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='payments_insert_same_clinic') THEN
        CREATE POLICY "payments_insert_same_clinic" ON public.payments FOR INSERT TO public WITH CHECK (clinic_id = (SELECT users.clinic_id FROM users WHERE users.id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='payments_super_admin_all') THEN
        CREATE POLICY "payments_super_admin_all" ON public.payments FOR ALL TO authenticated USING (public.is_super_admin());
    END IF;
END $$;

-- 11. RLS: invoices
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='invoices_select_same_clinic') THEN
        CREATE POLICY "invoices_select_same_clinic" ON public.invoices FOR SELECT TO public USING (clinic_id = (SELECT users.clinic_id FROM users WHERE users.id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='invoices_super_admin_all') THEN
        CREATE POLICY "invoices_super_admin_all" ON public.invoices FOR ALL TO authenticated USING (public.is_super_admin());
    END IF;
END $$;

-- 12. Indexes
CREATE INDEX IF NOT EXISTS idx_payments_clinic_id ON public.payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_id ON public.invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period ON public.subscriptions(grace_period_ends_at) WHERE status = 'expired';

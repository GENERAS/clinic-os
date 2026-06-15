-- SaaS Multi-Tenant: Plans, Subscriptions, and Clinic plan_id
-- Safe to run repeatedly (IF NOT EXISTS / IF EXISTS)

-- 1. Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
    id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name          text NOT NULL UNIQUE,
    slug          text NOT NULL UNIQUE,
    description   text,
    price_monthly numeric(10,2) NOT NULL DEFAULT 0,
    price_yearly  numeric(10,2) NOT NULL DEFAULT 0,
    max_staff     integer NOT NULL DEFAULT 5,
    max_patients  integer NOT NULL DEFAULT 100,
    whatsapp_enabled boolean NOT NULL DEFAULT false,
    features      jsonb DEFAULT '[]',
    is_active     boolean NOT NULL DEFAULT true,
    sort_order    integer NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id     uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    plan_id       uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
    billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    trial_ends_at timestamptz,
    current_period_start timestamptz NOT NULL DEFAULT now(),
    current_period_end   timestamptz NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    canceled_at    timestamptz,
    payment_provider text DEFAULT 'none',
    payment_provider_subscription_id text,
    metadata       jsonb DEFAULT '{}',
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 3. Add plan_id to clinics (nullable — clinic may not be on a plan yet)
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL;

-- 4. Insert default plans
INSERT INTO public.plans (name, slug, description, price_monthly, price_yearly, max_staff, max_patients, whatsapp_enabled, features, sort_order)
VALUES
  ('Free', 'free', 'For small clinics just getting started', 0, 0, 2, 50, false, '["Up to 2 staff","Up to 50 patients","Basic appointments","Email notifications"]', 1),
  ('Starter', 'starter', 'Essential tools for growing clinics', 29, 290, 5, 200, true, '["Up to 5 staff","Up to 200 patients","WhatsApp reminders","Inventory management","Basic reports"]', 2),
  ('Professional', 'professional', 'For established clinics with full teams', 79, 790, 15, 1000, true, '["Up to 15 staff","Up to 1000 patients","WhatsApp automation","Advanced inventory","Staff management","Priority support"]', 3),
  ('Enterprise', 'enterprise', 'Custom solutions for large healthcare groups', 199, 1990, 999, 99999, true, '["Unlimited staff","Unlimited patients","All WhatsApp features","Dedicated support","Custom integrations","SLA guarantee"]', 4)
ON CONFLICT (name) DO NOTHING;

-- 5. Enable RLS on new tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. RLS: everyone authenticated can SELECT plans (they're public)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plans' AND policyname='plans_select_authenticated') THEN
    CREATE POLICY "plans_select_authenticated" ON public.plans FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 7. RLS: super admin can manage plans
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plans' AND policyname='plans_super_admin_all') THEN
    CREATE POLICY "plans_super_admin_all" ON public.plans FOR ALL TO authenticated USING (public.is_super_admin());
  END IF;
END $$;

-- 8. RLS: subscriptions — clinic users can see own subscription
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_select_same_clinic') THEN
    CREATE POLICY "subscriptions_select_same_clinic" ON public.subscriptions FOR SELECT TO public USING (clinic_id = (SELECT users.clinic_id FROM users WHERE users.id = auth.uid()));
  END IF;
END $$;

-- 9. RLS: super admin can manage all subscriptions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_super_admin_all') THEN
    CREATE POLICY "subscriptions_super_admin_all" ON public.subscriptions FOR ALL TO authenticated USING (public.is_super_admin());
  END IF;
END $$;

-- 10. RLS: super admin can update clinics.plan_id (for plan assignment)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clinics' AND policyname='clinics_update_super_admin') THEN
    CREATE POLICY "clinics_update_super_admin" ON public.clinics FOR UPDATE TO authenticated USING (public.is_super_admin());
  END IF;
END $$;

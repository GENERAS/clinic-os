CREATE TABLE IF NOT EXISTS public.clinic_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic scoped" ON public.clinic_expenses FOR ALL USING (clinic_id = public.current_user_clinic_id() OR public.current_user_is_super_admin());
REVOKE ALL ON public.clinic_expenses FROM anon;

CREATE INDEX IF NOT EXISTS idx_clinic_expenses_clinic ON public.clinic_expenses(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_expenses_category ON public.clinic_expenses(category);
CREATE INDEX IF NOT EXISTS idx_clinic_expenses_date ON public.clinic_expenses(expense_date DESC);

DROP TRIGGER IF EXISTS trg_clinic_expenses_updated_at ON public.clinic_expenses;
CREATE TRIGGER trg_clinic_expenses_updated_at
    BEFORE UPDATE ON public.clinic_expenses
    FOR EACH ROW EXECUTE FUNCTION public.update_billing_timestamp();

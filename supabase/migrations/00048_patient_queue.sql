-- Migration 00048: Create patient_queue table
-- Safe to run repeatedly (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS public.patient_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    queue_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_consultation', 'completed', 'no_show', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'vip')),
    notes TEXT,
    sms_notified BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_queue_clinic_date ON public.patient_queue(clinic_id, queue_date);
CREATE INDEX IF NOT EXISTS idx_patient_queue_clinic_status ON public.patient_queue(clinic_id, status);

-- RLS
ALTER TABLE public.patient_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patient_queue_select ON public.patient_queue;
DROP POLICY IF EXISTS patient_queue_insert ON public.patient_queue;
DROP POLICY IF EXISTS patient_queue_update ON public.patient_queue;
DROP POLICY IF EXISTS patient_queue_delete ON public.patient_queue;

CREATE POLICY patient_queue_select ON public.patient_queue FOR SELECT USING (true);
CREATE POLICY patient_queue_insert ON public.patient_queue FOR INSERT WITH CHECK (true);
CREATE POLICY patient_queue_update ON public.patient_queue FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY patient_queue_delete ON public.patient_queue FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_queue TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_queue TO authenticated;

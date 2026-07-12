-- Migration 00046: Radiology Module
-- Adds: radiology_orders, radiology_images, radiology_reports

-- 1. RADIOLOGY ORDERS
CREATE TABLE IF NOT EXISTS public.radiology_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,

    modality TEXT NOT NULL CHECK (modality IN ('xray', 'ultrasound', 'ct', 'mri', 'ecg', 'echo', 'fluoroscopy', 'mammography', 'dexa', 'other')),
    body_part TEXT NOT NULL,
    clinical_indication TEXT NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'routine' CHECK (urgency IN ('urgent', 'routine', 'stat')),
    special_instructions TEXT,

    status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'scheduled', 'imaging_done', 'report_written', 'completed', 'cancelled')),

    scheduled_at TIMESTAMPTZ,
    performed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    ordered_by UUID REFERENCES public.users(id),
    assigned_radiologist_id UUID REFERENCES public.users(id),

    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. RADIOLOGY IMAGES
CREATE TABLE IF NOT EXISTS public.radiology_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.radiology_orders(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,

    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    storage_path TEXT,

    laterality TEXT CHECK (laterality IN ('left', 'right', 'bilateral', 'aplicable')),
    view_position TEXT,
    series_number INTEGER,
    image_notes TEXT,

    uploaded_by UUID REFERENCES public.users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RADIOLOGY REPORTS
CREATE TABLE IF NOT EXISTS public.radiology_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.radiology_orders(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,

    findings TEXT NOT NULL,
    impression TEXT NOT NULL,
    technique TEXT,
    comparison_studies TEXT,
    recommendations TEXT,
    addendum TEXT,

    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'preliminary', 'final', 'amended')),
    signed_at TIMESTAMPTZ,

    radiologist_id UUID NOT NULL REFERENCES public.users(id),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_radiology_orders_clinic ON public.radiology_orders(clinic_id);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_patient ON public.radiology_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_status ON public.radiology_orders(status);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_modality ON public.radiology_orders(modality);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_consultation ON public.radiology_orders(consultation_id);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_created ON public.radiology_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_radiology_images_order ON public.radiology_images(order_id);
CREATE INDEX IF NOT EXISTS idx_radiology_images_clinic ON public.radiology_images(clinic_id);

CREATE INDEX IF NOT EXISTS idx_radiology_reports_order ON public.radiology_reports(order_id);
CREATE INDEX IF NOT EXISTS idx_radiology_reports_clinic ON public.radiology_reports(clinic_id);
CREATE INDEX IF NOT EXISTS idx_radiology_reports_radiologist ON public.radiology_reports(radiologist_id);

-- 5. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.update_radiology_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_radiology_orders_updated_at ON public.radiology_orders;
CREATE TRIGGER trg_radiology_orders_updated_at
    BEFORE UPDATE ON public.radiology_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_radiology_order_timestamp();

CREATE OR REPLACE FUNCTION public.update_radiology_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_radiology_reports_updated_at ON public.radiology_reports;
CREATE TRIGGER trg_radiology_reports_updated_at
    BEFORE UPDATE ON public.radiology_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_radiology_report_timestamp();

-- 6. RLS POLICIES
ALTER TABLE public.radiology_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radiology_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radiology_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS radiology_orders_select ON public.radiology_orders;
DROP POLICY IF EXISTS radiology_orders_insert ON public.radiology_orders;
DROP POLICY IF EXISTS radiology_orders_update ON public.radiology_orders;
DROP POLICY IF EXISTS radiology_orders_delete ON public.radiology_orders;

CREATE POLICY radiology_orders_select ON public.radiology_orders FOR SELECT USING ((clinic_id = current_user_clinic_id()) OR current_user_is_super_admin());
CREATE POLICY radiology_orders_insert ON public.radiology_orders FOR INSERT WITH CHECK ((clinic_id = current_user_clinic_id()) OR current_user_is_super_admin());
CREATE POLICY radiology_orders_update ON public.radiology_orders FOR UPDATE USING ((clinic_id = current_user_clinic_id()) OR current_user_is_super_admin());
CREATE POLICY radiology_orders_delete ON public.radiology_orders FOR DELETE USING ((clinic_id = current_user_clinic_id()) OR current_user_is_super_admin());

DROP POLICY IF EXISTS radiology_images_select ON public.radiology_images;
DROP POLICY IF EXISTS radiology_images_insert ON public.radiology_images;
DROP POLICY IF EXISTS radiology_images_update ON public.radiology_images;
DROP POLICY IF EXISTS radiology_images_delete ON public.radiology_images;

CREATE POLICY radiology_images_select ON public.radiology_images FOR SELECT USING ((clinic_id = current_user_clinic_id()) OR current_user_is_super_admin());
CREATE POLICY radiology_images_insert ON public.radiology_images FOR INSERT WITH CHECK ((clinic_id = current_user_clinic_id()) OR current_user_is_super_admin());
CREATE POLICY radiology_images_update ON public.radiology_images FOR UPDATE USING ((clinic_id = current_user_clinic_id()) OR current_user_is_super_admin());
CREATE POLICY radiology_images_delete ON public.radiology_images FOR DELETE USING ((clinic_id = current_user_clinic_id()) OR current_user_is_super_admin());

DROP POLICY IF EXISTS radiology_reports_select ON public.radiology_reports;
DROP POLICY IF EXISTS radiology_reports_insert ON public.radiology_reports;
DROP POLICY IF EXISTS radiology_reports_update ON public.radiology_reports;
DROP POLICY IF EXISTS radiology_reports_delete ON public.radiology_reports;

CREATE POLICY radiology_reports_select ON public.radiology_reports FOR SELECT USING ((clinic_id = current_user_clinic_id()) OR current_user_is_super_admin());
CREATE POLICY radiology_reports_insert ON public.radiology_reports FOR INSERT WITH CHECK ((clinic_id = current_user_clinic_id()) OR current_user_is_super_admin());
CREATE POLICY radiology_reports_update ON public.radiology_reports FOR UPDATE USING ((clinic_id = current_user_clinic_id()) OR current_user_is_super_admin());
CREATE POLICY radiology_reports_delete ON public.radiology_reports FOR DELETE USING ((clinic_id = current_user_clinic_id()) OR current_user_is_super_admin());

-- 7. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('radiology-images', 'radiology-images', false)
ON CONFLICT (id) DO NOTHING;

-- 8. STORAGE POLICIES
DROP POLICY IF EXISTS radiology_images_storage_select ON storage.objects;
CREATE POLICY radiology_images_storage_select ON storage.objects FOR SELECT USING (bucket_id = 'radiology-images');
DROP POLICY IF EXISTS radiology_images_storage_insert ON storage.objects;
CREATE POLICY radiology_images_storage_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'radiology-images');
DROP POLICY IF EXISTS radiology_images_storage_delete ON storage.objects;
CREATE POLICY radiology_images_storage_delete ON storage.objects FOR DELETE USING (bucket_id = 'radiology-images');

-- 9. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.radiology_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.radiology_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.radiology_reports TO authenticated;

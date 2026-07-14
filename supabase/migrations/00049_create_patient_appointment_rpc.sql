-- Migration 00049: Add missing RPC functions for onboarding and demo

-- 1. create_patient RPC
CREATE OR REPLACE FUNCTION public.create_patient(
    p_clinic_id UUID,
    p_full_name TEXT,
    p_phone TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_gender TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO public.patients (clinic_id, full_name, phone, created_by, date_of_birth, gender, email)
    VALUES (p_clinic_id, p_full_name, p_phone, p_created_by, p_date_of_birth, p_gender, p_email)
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$;

-- 2. create_appointment RPC
CREATE OR REPLACE FUNCTION public.create_appointment(
    p_clinic_id UUID,
    p_patient_id UUID,
    p_patient_name TEXT,
    p_patient_phone TEXT DEFAULT NULL,
    p_doctor_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_appointment_date DATE DEFAULT CURRENT_DATE,
    p_start_time TIME DEFAULT '09:00',
    p_end_time TIME DEFAULT '09:30',
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO public.appointments (
        clinic_id, patient_id, patient_name, patient_phone,
        doctor_id, created_by, appointment_date,
        start_time, end_time, reason, status
    )
    VALUES (
        p_clinic_id, p_patient_id, p_patient_name, p_patient_phone,
        p_doctor_id, p_created_by, p_appointment_date,
        p_start_time, p_end_time, p_reason, 'scheduled'
    )
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_patient(UUID, TEXT, TEXT, UUID, DATE, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_patient(UUID, TEXT, TEXT, UUID, DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_appointment(UUID, UUID, TEXT, TEXT, UUID, UUID, DATE, TIME, TIME, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_appointment(UUID, UUID, TEXT, TEXT, UUID, UUID, DATE, TIME, TIME, TEXT) TO authenticated;

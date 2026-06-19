"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getConsultationService } from "@/features/consultations/services/consultation.service";
import { ConsultationForm } from "@/features/consultations/components/ConsultationForm";
import { getPatientService } from "@/features/patients/services/patient.service";
import { toast } from "sonner";

export default function NewConsultationPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const patientId = searchParams.get("patientId");
    const appointmentId = searchParams.get("appointmentId");

    const consultService = useMemo(() => getConsultationService(), []);
    const patientService = useMemo(() => getPatientService(), []);

    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!clinicId || !patientId) { setLoading(false); return; }
        patientService.getPatientById(clinicId, patientId)
            .then(setPatient)
            .catch(() => toast.error("Failed to load patient"))
            .finally(() => setLoading(false));
    }, [clinicId, patientId, patientService]);

    const handleSave = useCallback(async (data, diagnoses, prescriptions, investigations) => {
        if (!clinicId || !user) return;
        setSaving(true);
        try {
            const id = await consultService.createConsultation(clinicId, data, diagnoses, prescriptions, investigations, user.id);
            toast.success("Consultation saved as draft");
            navigate(`/consultations/${id}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save consultation");
        } finally {
            setSaving(false);
        }
    }, [clinicId, user, consultService, navigate]);

    const handleComplete = useCallback(async (data, diagnoses, prescriptions, investigations) => {
        if (!clinicId || !user) return;
        setSaving(true);
        try {
            const id = await consultService.createConsultation(
                clinicId,
                { ...data, status: "completed" },
                diagnoses, prescriptions, investigations, user.id
            );
            await consultService.supabase
                .from("appointments")
                .update({ status: "completed" })
                .eq("id", appointmentId)
                .eq("clinic_id", clinicId);
            toast.success("Consultation completed");
            navigate(`/consultations/${id}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to complete consultation");
        } finally {
            setSaving(false);
        }
    }, [clinicId, user, consultService, navigate, appointmentId]);

    if (!patientId) {
        return (
            <div className="space-y-6">
                <PageHeader title="New Consultation">
                    <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-4" /> Back
                    </button>
                </PageHeader>
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <p className="text-sm text-muted-foreground">No patient selected. Please start from a patient or appointment.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground"/></div>;
    }

    if (!patient) {
        return (
            <div className="space-y-6">
                <PageHeader title="Patient Not Found" />
                <p className="text-sm text-muted-foreground">Could not load patient details.</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <PageHeader title="New Consultation">
                <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="size-4" /> Back
                </button>
            </PageHeader>

            <ConsultationForm
                patient={patient}
                doctorName={user?.full_name || "Doctor"}
                initialData={{ appointment_id: appointmentId }}
                onSave={handleSave}
                onComplete={handleComplete}
                onCancel={() => navigate(-1)}
                saving={saving}
            />
        </div>
    );
}

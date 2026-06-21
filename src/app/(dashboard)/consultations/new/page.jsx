"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getConsultationService } from "@/features/consultations/services/consultation.service";
import { ConsultationForm } from "@/features/consultations/components/ConsultationForm";
import { getPatientService } from "@/features/patients/services/patient.service";
import { getTriageService } from "@/features/triage/services/triage.service";
import { toast } from "sonner";

const LEGACY_VITAL_MAP = { bp_systolic: "systolic_bp", bp_diastolic: "diastolic_bp", pulse: "heart_rate", spo2: "oxygen_saturation" };

function normalizeVitals(v) {
    if (!v || typeof v !== "object") return v || {};
    const out = { ...v };
    for (const [oldKey, newKey] of Object.entries(LEGACY_VITAL_MAP)) {
        if (v[oldKey] !== undefined && v[newKey] === undefined) {
            out[newKey] = v[oldKey];
            delete out[oldKey];
        }
    }
    return out;
}

export default function NewConsultationPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const patientId = searchParams.get("patientId");
    const appointmentId = searchParams.get("appointmentId");
    const triageId = searchParams.get("triageId");

    const consultService = useMemo(() => getConsultationService(), []);
    const patientService = useMemo(() => getPatientService(), []);
    const triageService = useMemo(() => getTriageService(), []);

    const [patient, setPatient] = useState(null);
    const [triageData, setTriageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!clinicId || !patientId) { setLoading(false); return; }
        Promise.all([
            patientService.getPatientById(clinicId, patientId),
            triageId ? triageService.getTriageById(clinicId, triageId).catch(() => null) : Promise.resolve(null),
        ])
            .then(([pt, triage]) => {
                setPatient(pt);
                setTriageData(triage);
            })
            .catch(() => toast.error("Failed to load patient"))
            .finally(() => setLoading(false));
    }, [clinicId, patientId, triageId, patientService, triageService]);

    const handleSave = useCallback(async (data, diagnoses, prescriptions, investigations) => {
        if (!clinicId || !user) return;
        setSaving(true);
        try {
            const id = await consultService.createConsultation(clinicId, data, diagnoses, prescriptions, investigations, user.id);
            if (triageData?.id) {
                await triageService.updateTriageStatus(clinicId, triageData.id, "completed", id);
            }
            toast.success("Consultation saved as draft");
            navigate(`/consultations/${id}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save consultation");
        } finally {
            setSaving(false);
        }
    }, [clinicId, user, consultService, triageData, triageService, navigate]);

    const handleComplete = useCallback(async (data, diagnoses, prescriptions, investigations) => {
        if (!clinicId || !user) return;
        setSaving(true);
        try {
            const id = await consultService.createConsultation(
                clinicId,
                { ...data, status: "completed" },
                diagnoses, prescriptions, investigations, user.id
            );
            if (triageData?.id) {
                await triageService.updateTriageStatus(clinicId, triageData.id, "completed", id);
            }
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
    }, [clinicId, user, consultService, triageData, triageService, navigate, appointmentId]);

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
                initialData={{
                    appointment_id: appointmentId,
                    chief_complaint: triageData?.chief_complaint || "",
                    vital_signs: triageData?.vital_signs ? normalizeVitals(triageData.vital_signs) : {},
                }}
                onSave={handleSave}
                onComplete={handleComplete}
                onCancel={() => navigate(-1)}
                saving={saving}
            />
        </div>
    );
}

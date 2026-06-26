"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getTriageService } from "@/features/triage/services/triage.service";
import { getPatientService } from "@/features/patients/services/patient.service";
import { TriageForm } from "@/features/triage/components/TriageForm";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

export default function NewTriagePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const patientId = searchParams.get("patientId");
    const appointmentId = searchParams.get("appointmentId");

    const triageService = useMemo(() => getTriageService(), []);
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

    const handleSave = useCallback(async (data) => {
        if (!clinicId || !user) return;
        setSaving(true);
        try {
            const triageId = await triageService.createTriage(clinicId, { ...data, appointment_id: appointmentId }, user.id);
            toast.success("Triage completed — patient moved to queue");
            navigate("/triage");
        } catch (err) {
            toast.error(handleApiError(err, "Failed to save triage"));
        } finally {
            setSaving(false);
        }
    }, [clinicId, user, triageService, appointmentId, navigate]);

    if (!patientId) {
        return (
            <div className="space-y-6">
                <PageHeader title="New Triage">
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
        <div className="mx-auto max-w-3xl space-y-6">
            <PageHeader title={`Triage — ${patient.full_name}`}>
                <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="size-4" /> Back
                </button>
            </PageHeader>

            <TriageForm
                patient={{ ...patient, appointment_id: appointmentId }}
                onSave={handleSave}
                onCancel={() => navigate(-1)}
                saving={saving}
            />
        </div>
    );
}

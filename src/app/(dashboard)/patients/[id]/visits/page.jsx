"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowLeft, Stethoscope, Calendar, Clock, User } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getConsultationService } from "@/features/consultations/services/consultation.service";
import { getPatientService } from "@/features/patients/services/patient.service";
import { VisitHistoryList } from "@/features/patients/components/VisitHistoryList";
import { toast } from "sonner";

export default function PatientVisitHistoryPage() {
    const { id } = useParams();
    const { clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const consultService = useMemo(() => getConsultationService(), []);
    const patientService = useMemo(() => getPatientService(), []);
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!clinicId || !id) { setLoading(false); return; }
        Promise.all([
            patientService.getPatientById(clinicId, id),
        ])
            .then(([p]) => setPatient(p))
            .catch(() => toast.error("Failed to load patient"))
            .finally(() => setLoading(false));
    }, [clinicId, id, patientService]);

    if (loading) {
        return <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground"/></div>;
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <PageHeader title={patient ? `Visit History — ${patient.full_name}` : "Visit History"}>
                <div className="flex items-center gap-2">
                    <Link to={patient ? `/patients/${patient.id}` : "/patients"} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-4" /> Back to Patient
                    </Link>
                </div>
            </PageHeader>

            <VisitHistoryList clinicId={clinicId} patientId={id} service={consultService} />
        </div>
    );
}

"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getConsultationService } from "@/features/consultations/services/consultation.service";
import { ConsultationView } from "@/features/consultations/components/ConsultationView";
import { toast } from "sonner";

export default function ConsultationDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getConsultationService(), []);
    const [consultation, setConsultation] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!clinicId || !id) return;
        setLoading(true);
        try {
            const data = await service.getConsultation(clinicId, id);
            setConsultation(data);
        } catch {
            toast.error("Failed to load consultation");
        } finally {
            setLoading(false);
        }
    }, [clinicId, id, service]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground"/></div>;
    }

    if (!consultation) {
        return (
            <div className="space-y-6">
                <PageHeader title="Consultation Not Found">
                    <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-4" /> Back to Dashboard
                    </button>
                </PageHeader>
                <p className="text-sm text-muted-foreground">This consultation does not exist or you do not have access to it.</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <PageHeader title="Consultation">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/patients/${consultation.patient_id}/visits`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                        Visit History
                    </button>
                    <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-4" /> Back
                    </button>
                </div>
            </PageHeader>

            <ConsultationView consultation={consultation} clinic={authClinic} />
        </div>
    );
}

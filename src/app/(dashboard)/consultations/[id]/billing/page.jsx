"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, CreditCard, User, Shield } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getConsultationService } from "@/features/consultations/services/consultation.service";
import { getBillingService } from "@/features/billing/services/billing.service";
import { BillingPanel } from "@/features/billing/components/BillingPanel";
import { toast } from "sonner";

export default function ConsultationBillingPage() {
    const { id: consultationId } = useParams();
    const navigate = useNavigate();
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const consultationService = useMemo(() => getConsultationService(), []);
    const billingService = useMemo(() => getBillingService(), []);
    const [consultation, setConsultation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!clinicId || !consultationId) { setLoading(false); return; }
        consultationService.getConsultation(clinicId, consultationId)
            .then(setConsultation)
            .catch(() => toast.error("Failed to load consultation"))
            .finally(() => setLoading(false));
    }, [clinicId, consultationId, consultationService]);

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground"/></div>;

    if (!consultation) {
        return <div className="space-y-6">
            <PageHeader title="Not Found" />
            <p className="text-sm text-muted-foreground">Consultation not found.</p>
        </div>;
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <PageHeader title={`Billing — ${consultation.patients?.full_name || "Patient"}`}>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/consultations/${consultationId}`)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                        <ArrowLeft className="size-3.5" /> Back to Consultation
                    </button>
                </div>
            </PageHeader>

            <div className="rounded-xl border bg-white p-5 flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{consultation.patients?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{consultation.patients?.phone}</p>
                </div>
                {consultation.patients?.insurance_provider && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5">
                        <Shield className="size-3.5 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700">{consultation.patients.insurance_provider}</span>
                        <span className="text-[10px] text-blue-500">#{consultation.patients.insurance_policy_number || "—"}</span>
                    </div>
                )}
            </div>

            <BillingPanel
                consultationId={consultationId}
                patientId={consultation.patient_id}
                clinicId={clinicId}
                userId={user?.id}
                service={billingService}
                patient={consultation.patients}
            />
        </div>
    );
}

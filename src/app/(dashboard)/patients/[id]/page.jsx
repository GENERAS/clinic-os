"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, User, MessageSquare, Calendar, Edit, DollarSign, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getPatientService } from "@/features/patients/services/patient.service";
import { getBillingService } from "@/features/billing/services/billing.service";
import { getConsultationService } from "@/features/consultations/services/consultation.service";
import { PatientProfileHeader } from "@/features/patients/components/patient-profile-header";
import { PatientNotes } from "@/features/patients/components/patient-notes";
import { PatientAppointmentsList } from "@/features/patients/components/patient-appointments-list";
import { VisitHistoryList } from "@/features/patients/components/VisitHistoryList";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";
export default function PatientDetailPage() {
    const { id } = useParams();
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState([]);
    const [visits, setVisits] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const service = useMemo(() => getPatientService(), []);
    const billing = useMemo(() => getBillingService(), []);
    const consultService = useMemo(() => getConsultationService(), []);
    const loadPatient = useCallback(async () => {
        if (!clinicId)
            return;
        setLoading(true);
        try {
            const data = await service.getPatientById(clinicId, id);
            setPatient(data);
            if (data) {
                const [patientNotes, patientInvoices] = await Promise.all([
                    service.getPatientNotes(clinicId, id),
                    billing.getInvoices(clinicId, { patientId: id }).catch(() => []),
                ]);
                setNotes(patientNotes);
                setInvoices(patientInvoices || []);
            }
        }
        catch {
            toast.error("Failed to load patient");
        }
        finally {
            setLoading(false);
        }
    }, [clinicId, id, service, billing]);
    useEffect(() => {
        loadPatient();
    }, [loadPatient]);
    const handleAddNote = async (content) => {
        if (!clinicId || !user)
            return;
        try {
            await service.addPatientNote(clinicId, id, content, user.id);
            toast.success("Note added");
            const patientNotes = await service.getPatientNotes(clinicId, id);
            setNotes(patientNotes);
        }
        catch {
            toast.error("Failed to add note");
        }
    };
    if (loading) {
        return (<div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground"/>
      </div>);
    }
    if (!patient) {
        return (<div className="space-y-6">
        <PageHeader title="Patient Not Found">
          <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4"/>
            Back to Patients
          </Link>
        </PageHeader>
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            This patient does not exist or you do not have access to it.
          </p>
        </div>
      </div>);
    }
    return (<div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Patient Profile">
        <div className="flex items-center gap-2">
          <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4"/>
            Back
          </Link>
        </div>
      </PageHeader>

      <PatientProfileHeader patient={patient}/>

      {patient.national_id && (
        <SectionCard title="National ID">
          <p className="text-sm font-mono tracking-wider">{patient.national_id.replace(/(\d{4})(?=\d)/g, "$1 ")}</p>
        </SectionCard>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Emergency Contact */}
        {patient.emergency_contact_name && (<SectionCard title="Emergency Contact" icon={<User className="size-4"/>}>
            <div className="space-y-1">
              <p className="text-sm font-medium">{patient.emergency_contact_name}</p>
              {patient.emergency_contact_phone && (<p className="text-xs text-muted-foreground">{patient.emergency_contact_phone}</p>)}
            </div>
          </SectionCard>)}

        {/* Created Info */}
        <SectionCard title="Record Info">
          <p className="text-xs text-muted-foreground">
            Created {new Date(patient.created_at).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Last updated {new Date(patient.updated_at).toLocaleString()}
          </p>
        </SectionCard>
      </div>

      {/* Patient Notes */}
      {patient.notes && (<SectionCard title="General Notes" icon={<Edit className="size-4"/>}>
          <p className="text-sm">{patient.notes}</p>
        </SectionCard>)}

      {/* Appointment History */}
      <SectionCard title="Appointment History" icon={<Calendar className="size-4"/>}>
        {clinicId && <PatientAppointmentsList clinicId={clinicId} patientId={id}/>}
      </SectionCard>

      {/* Visit History */}
      <SectionCard title="Visit History" icon={<Stethoscope className="size-4"/>}>
        {clinicId && <VisitHistoryList clinicId={clinicId} patientId={id} service={consultService} />}
      </SectionCard>

      {/* Billing History */}
      <SectionCard title="Billing History" icon={<DollarSign className="size-4"/>}>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <DollarSign className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No billing history for this patient.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {invoices.slice(0, 10).map((inv) => (
              <Link
                key={inv.id}
                to={`/consultations/${inv.consultation_id}/billing`}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-xs font-medium">{inv.invoice_number}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    inv.status === "paid" ? "text-emerald-600 bg-emerald-50" :
                    inv.status === "issued" ? "text-blue-600 bg-blue-50" :
                    inv.status === "partially_paid" ? "text-amber-600 bg-amber-50" :
                    "text-gray-600 bg-gray-50"
                  }`}>{inv.status.replace("_", " ")}</span>
                </div>
                <span className="text-xs font-semibold">
                  {new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(inv.total)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Internal Notes */}
      <SectionCard title="Internal Notes" icon={<MessageSquare className="size-4"/>}>
        {clinicId && (<PatientNotes notes={notes} onAddNote={handleAddNote}/>)}
      </SectionCard>
    </div>);
}

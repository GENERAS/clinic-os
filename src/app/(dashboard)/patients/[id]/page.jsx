"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, User, MessageSquare, Calendar, Edit, DollarSign, Stethoscope, AlertTriangle, Pill, Activity, FileText } from "lucide-react";
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
    const [medHistory, setMedHistory] = useState(null);
    const [medHistoryLoading, setMedHistoryLoading] = useState(false);
    const [showMedHistory, setShowMedHistory] = useState(false);
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

    const loadMedicalHistory = useCallback(async () => {
        if (!clinicId || !id) return;
        setMedHistoryLoading(true);
        try {
            const data = await service.getMedicalHistory(clinicId, id);
            setMedHistory(data);
        } catch (err) {
            toast.error(handleApiError(err, "Failed to load medical history"));
        } finally {
            setMedHistoryLoading(false);
        }
    }, [clinicId, id, service]);

    useEffect(() => {
        loadPatient();
    }, [loadPatient]);

    useEffect(() => {
        if (showMedHistory && !medHistory) loadMedicalHistory();
    }, [showMedHistory, medHistory, loadMedicalHistory]);

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
        {patient.emergency_contact_name && (<SectionCard title="Emergency Contact" icon={<User className="size-4"/>}>
            <div className="space-y-1">
              <p className="text-sm font-medium">{patient.emergency_contact_name}</p>
              {patient.emergency_contact_phone && (<p className="text-xs text-muted-foreground">{patient.emergency_contact_phone}</p>)}
            </div>
          </SectionCard>)}

        <SectionCard title="Record Info">
          <p className="text-xs text-muted-foreground">
            Created {new Date(patient.created_at).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Last updated {new Date(patient.updated_at).toLocaleString()}
          </p>
        </SectionCard>
      </div>

      {patient.notes && (<SectionCard title="General Notes" icon={<Edit className="size-4"/>}>
          <p className="text-sm">{patient.notes}</p>
        </SectionCard>)}

      {/* Medical History Toggle */}
      <SectionCard
        title="Medical History"
        icon={<Activity className="size-4"/>}
        actions={
          <button onClick={() => { setShowMedHistory(!showMedHistory); }}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/5 transition-colors">
            {showMedHistory ? "Hide" : "View Full History"}
          </button>
        }
      >
        {showMedHistory ? (
          medHistoryLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground"/></div>
          ) : medHistory ? (
            <div className="space-y-4">
              {/* Allergies */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="size-3.5 text-amber-500" />
                  <h4 className="text-xs font-semibold">Allergies</h4>
                </div>
                {medHistory.allergies.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No known allergies</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {medHistory.allergies.map((a, i) => (
                      <span key={i} className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-medium text-red-700">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Chronic Conditions */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="size-3.5 text-blue-500" />
                  <h4 className="text-xs font-semibold">Chronic Conditions</h4>
                </div>
                {medHistory.chronicConditions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recorded conditions</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {medHistory.chronicConditions.map((c, i) => (
                      <span key={i} className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-700">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Medications */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Pill className="size-3.5 text-emerald-500" />
                  <h4 className="text-xs font-semibold">Current Medications</h4>
                </div>
                {medHistory.currentMedications.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active medications</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {medHistory.currentMedications.map((m, i) => (
                      <span key={i} className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Visits Timeline */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Stethoscope className="size-3.5 text-purple-500" />
                  <h4 className="text-xs font-semibold">Past Visits</h4>
                </div>
                {medHistory.consultations.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No consultations recorded</p>
                ) : (
                  <div className="space-y-2">
                    {medHistory.consultations.map(c => {
                      const visitDate = new Date(c.created_at);
                      const primaryDiags = (c.diagnoses || []).filter(d => d.type === "primary").map(d => d.description);
                      const meds = (c.prescriptions || []).map(p => p.medicine_name);
                      return (
                        <Link key={c.id} to={`/consultations/${c.id}`}
                          className="block rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="size-3" />
                              {visitDate.toLocaleDateString("en-RW", { year: "numeric", month: "short", day: "numeric" })}
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              c.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                              c.status === "in_progress" ? "bg-amber-50 text-amber-700" :
                              "bg-red-50 text-red-700"
                            }`}>{c.status}</span>
                          </div>
                          <p className="mt-1 text-xs font-medium">{c.chief_complaint || "No complaint recorded"}</p>
                          {c.assessment && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{c.assessment}</p>}
                          {primaryDiags.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              <span className="font-medium">Dx:</span> {primaryDiags.join(", ")}
                            </p>
                          )}
                          {meds.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              <span className="font-medium">Rx:</span> {meds.slice(0, 3).join(", ")}{meds.length > 3 ? ` +${meds.length - 3} more` : ""}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                            <User className="size-2.5" />
                            {c.users?.full_name || "Unknown doctor"}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null
        ) : (
          <p className="text-xs text-muted-foreground">Click "View Full History" to see allergies, conditions, medications, and past visits.</p>
        )}
      </SectionCard>

      <SectionCard title="Appointment History" icon={<Calendar className="size-4"/>}>
        {clinicId && <PatientAppointmentsList clinicId={clinicId} patientId={id}/>}
      </SectionCard>

      <SectionCard title="Visit History" icon={<Stethoscope className="size-4"/>}>
        {clinicId && <VisitHistoryList clinicId={clinicId} patientId={id} service={consultService} />}
      </SectionCard>

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

      <SectionCard title="Internal Notes" icon={<MessageSquare className="size-4"/>}>
        {clinicId && (<PatientNotes notes={notes} onAddNote={handleAddNote}/>)}
      </SectionCard>
    </div>);
}

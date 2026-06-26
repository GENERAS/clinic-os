"use client";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Calendar, User, Stethoscope, FileText, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getAppointmentService } from "@/features/appointments/services/appointment.service";
import { createAppointmentSchema } from "@/features/appointments/schemas";
import { PatientSearchBar } from "@/features/patients/components/patient-search-bar";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";
export default function NewAppointmentPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const [saving, setSaving] = useState(false);
    const [doctors, setDoctors] = useState([]);
    const [showPatientSearch, setShowPatientSearch] = useState(false);
    const service = useMemo(() => getAppointmentService(), []);
    const { register, handleSubmit, formState: { errors }, setValue, watch, } = useForm({
        resolver: zodResolver(createAppointmentSchema),
    });
    useEffect(() => {
        if (!clinicId)
            return;
        service.getDoctors(clinicId).then(setDoctors).catch(() => { });
    }, [clinicId, service]);
    useEffect(() => {
        const patientId = searchParams.get("patient_id");
        if (patientId && clinicId) {
            import("@/features/patients/services/patient.service").then(({ getPatientService }) => {
                getPatientService().getPatientById(clinicId, patientId).then((patient) => {
                    if (patient) {
                        setValue("patient_name", patient.full_name);
                        setValue("patient_phone", patient.phone);
                        setValue("patient_id", patient.id);
                    }
                }).catch(() => { });
            });
        }
    }, [searchParams, clinicId, setValue]);
    const handlePatientSelect = (patient) => {
        setValue("patient_name", patient.full_name);
        setValue("patient_phone", patient.phone);
        setValue("patient_id", patient.id);
        setShowPatientSearch(false);
    };
    const onSubmit = async (values) => {
        if (!clinicId || !user)
            return;
        setSaving(true);
        try {
            const appointment = await service.createAppointment(clinicId, {
                patient_name: values.patient_name,
                patient_phone: values.patient_phone || null,
                patient_id: values.patient_id || null,
                doctor_id: values.doctor_id,
                appointment_date: values.appointment_date,
                start_time: values.start_time,
                end_time: values.end_time,
                reason: values.reason || null,
                notes: values.notes || null,
            }, user.id);
            toast.success("Appointment created");
            navigate(`/appointments/${appointment.id}`);
        }
        catch (err) {
            toast.error(handleApiError(err, "Failed to create appointment"));
        }
        finally {
            setSaving(false);
        }
    };
    return (<div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="New Appointment">
        <Link to="/appointments" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4"/>
          Back
        </Link>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Patient Info */}
        <SectionCard title="Patient Information" icon={<User className="size-4"/>}>
          <div className="space-y-4">
            {showPatientSearch && clinicId ? (<div>
                <label className="mb-1.5 block text-sm font-medium">Search existing patient</label>
                <PatientSearchBar clinicId={clinicId} onSelectPatient={handlePatientSelect} autoFocus placeholder="Search by name or phone..."/>
                <button type="button" onClick={() => setShowPatientSearch(false)} className="mt-2 text-xs text-muted-foreground hover:text-foreground">
                  Or enter details manually
                </button>
              </div>) : (<div>
                <button type="button" onClick={() => setShowPatientSearch(true)} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  <Search className="size-4"/>
                  Search existing patient
                </button>
              </div>)}
            <div>
              <label htmlFor="patient_name" className="mb-1.5 block text-sm font-medium">
                Patient Name *
              </label>
              <input id="patient_name" type="text" placeholder="Enter patient name" {...register("patient_name")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
              {errors.patient_name && (<p className="mt-1 text-xs text-destructive">{errors.patient_name.message}</p>)}
            </div>
            <div>
              <label htmlFor="patient_phone" className="mb-1.5 block text-sm font-medium">
                Patient Phone
              </label>
              <input id="patient_phone" type="tel" placeholder="+250 7XX XXX XXX" {...register("patient_phone")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
            </div>
          </div>
        </SectionCard>

        {/* Doctor Assignment */}
        <SectionCard title="Doctor Assignment" icon={<Stethoscope className="size-4"/>}>
          <div>
            <label htmlFor="doctor_id" className="mb-1.5 block text-sm font-medium">
              Doctor *
            </label>
            <select id="doctor_id" {...register("doctor_id")} disabled={saving || doctors.length === 0} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60">
              <option value="">Select a doctor</option>
              {doctors.map((doc) => (<option key={doc.id} value={doc.id}>
                  {doc.full_name}
                </option>))}
            </select>
            {errors.doctor_id && (<p className="mt-1 text-xs text-destructive">{errors.doctor_id.message}</p>)}
            {doctors.length === 0 && (<p className="mt-1 text-xs text-muted-foreground">
                No active doctors found. Add staff with Doctor role first.
              </p>)}
          </div>
        </SectionCard>

        {/* Date & Time */}
        <SectionCard title="Date & Time" icon={<Calendar className="size-4"/>}>
          <div className="space-y-4">
            <div>
              <label htmlFor="appointment_date" className="mb-1.5 block text-sm font-medium">
                Date *
              </label>
              <input id="appointment_date" type="date" {...register("appointment_date")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
              {errors.appointment_date && (<p className="mt-1 text-xs text-destructive">{errors.appointment_date.message}</p>)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_time" className="mb-1.5 block text-sm font-medium">
                  Start Time *
                </label>
                <input id="start_time" type="time" {...register("start_time")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
                {errors.start_time && (<p className="mt-1 text-xs text-destructive">{errors.start_time.message}</p>)}
              </div>
              <div>
                <label htmlFor="end_time" className="mb-1.5 block text-sm font-medium">
                  End Time *
                </label>
                <input id="end_time" type="time" {...register("end_time")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
                {errors.end_time && (<p className="mt-1 text-xs text-destructive">{errors.end_time.message}</p>)}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Reason & Notes */}
        <SectionCard title="Details" icon={<FileText className="size-4"/>}>
          <div className="space-y-4">
            <div>
              <label htmlFor="reason" className="mb-1.5 block text-sm font-medium">
                Reason for Visit
              </label>
              <input id="reason" type="text" placeholder="e.g. Routine checkup, fever, prescription refill" {...register("reason")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
            </div>
            <div>
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
                Internal Notes
              </label>
              <textarea id="notes" rows={3} placeholder="Any additional notes (not visible to patient)" {...register("notes")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
            </div>
          </div>
        </SectionCard>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link to="/appointments" className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
            Cancel
          </Link>
          <button type="submit" disabled={saving || doctors.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 className="size-4 animate-spin"/>}
            {saving ? "Creating..." : "Create Appointment"}
          </button>
        </div>
      </form>
    </div>);
}

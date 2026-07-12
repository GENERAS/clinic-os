"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Loader2, ArrowLeft, BedDouble, Heart, Pill, FileText, Clock,
    Plus, X, User, Phone, MapPin, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getAdmissionService } from "@/features/admissions/services/admission.service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const VITAL_FIELDS = [
    { key: "systolic_bp", label: "Systolic BP", unit: "mmHg" },
    { key: "diastolic_bp", label: "Diastolic BP", unit: "mmHg" },
    { key: "heart_rate", label: "Heart Rate", unit: "bpm" },
    { key: "temperature", label: "Temperature", unit: "°C" },
    { key: "respiratory_rate", label: "Respiratory Rate", unit: "/min" },
    { key: "oxygen_saturation", label: "SpO2", unit: "%" },
    { key: "blood_glucose", label: "Blood Glucose", unit: "mg/dL" },
];

const ROUTES = ["oral", "iv", "im", "sc", "topical", "inhalation", "rectal"];
const FREQUENCIES = ["once daily", "twice daily", "three times daily", "four times daily", "every 4 hours", "every 6 hours", "every 8 hours", "as needed", "at bedtime", "stat"];

const STATUS_STYLES = {
    active: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Active" },
    discharged: { bg: "bg-blue-50", text: "text-blue-700", label: "Discharged" },
    transferred: { bg: "bg-amber-50", text: "text-amber-700", label: "Transferred" },
    left_ama: { bg: "bg-red-50", text: "text-red-700", label: "Left AMA" },
};

export default function AdmissionDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getAdmissionService(), []);

    const [admission, setAdmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState("vitals");

    const [showVitalsForm, setShowVitalsForm] = useState(false);
    const [vitalsForm, setVitalsForm] = useState({});
    const [vitalsNotes, setVitalsNotes] = useState("");

    const [showMedForm, setShowMedForm] = useState(false);
    const [medForm, setMedForm] = useState({ medicine_name: "", dosage: "", frequency: "", route: "oral" });

    const [showDischarge, setShowDischarge] = useState(false);
    const [dischargeForm, setDischargeForm] = useState({ discharge_summary: "", discharge_instructions: "", status: "discharged" });

    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!clinicId || !id) return;
        setLoading(true);
        try {
            const data = await service.getAdmission(clinicId, id);
            setAdmission(data);
        } catch {
            toast.error("Failed to load admission");
        } finally {
            setLoading(false);
        }
    }, [clinicId, id, service]);

    useEffect(() => { load(); }, [load]);

    const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
    const formatDateTime = (d) => d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
    const calcDays = (a, b) => {
        const start = new Date(a);
        const end = b ? new Date(b) : new Date();
        return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    };

    const handleVitalsChange = (key, value) => setVitalsForm(prev => ({ ...prev, [key]: value }));

    const handleSaveVitals = async () => {
        if (!clinicId || !user || !id) return;
        const hasAny = Object.values(vitalsForm).some(v => v && v.toString().trim() !== "");
        if (!hasAny) { toast.error("Enter at least one vital sign"); return; }
        setSaving(true);
        try {
            await service.addVitals(clinicId, id, vitalsForm, vitalsNotes || null, user.id);
            toast.success("Vitals recorded");
            setShowVitalsForm(false);
            setVitalsForm({});
            setVitalsNotes("");
            await load();
        } catch (err) {
            toast.error(handleApiError(err, "Failed to save vitals"));
        } finally {
            setSaving(false);
        }
    };

    const handleSaveMed = async () => {
        if (!clinicId || !user || !id) return;
        if (!medForm.medicine_name) { toast.error("Medicine name is required"); return; }
        setSaving(true);
        try {
            await service.addMedication(clinicId, id, medForm, user.id);
            toast.success("Medication added");
            setShowMedForm(false);
            setMedForm({ medicine_name: "", dosage: "", frequency: "", route: "oral" });
            await load();
        } catch (err) {
            toast.error(handleApiError(err, "Failed to add medication"));
        } finally {
            setSaving(false);
        }
    };

    const handleDischarge = async () => {
        if (!clinicId || !user || !id) return;
        setSaving(true);
        try {
            await service.dischargePatient(clinicId, id, dischargeForm, user.id);
            toast.success("Patient discharged");
            setShowDischarge(false);
            await load();
        } catch (err) {
            toast.error(handleApiError(err, "Failed to discharge patient"));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
    }

    if (!admission) {
        return (
            <div className="space-y-6">
                <PageHeader title="Admission Not Found">
                    <button onClick={() => navigate("/admissions")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-4" /> Back
                    </button>
                </PageHeader>
                <p className="text-sm text-muted-foreground">This admission does not exist or you do not have access.</p>
            </div>
        );
    }

    const isActive = admission.status === "active";
    const style = STATUS_STYLES[admission.status] || STATUS_STYLES.active;
    const days = calcDays(admission.admission_date, admission.discharge_date);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <PageHeader title="Admission">
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${style.bg} ${style.text}`}>
                        {style.label}
                    </span>
                    {isActive && (
                        <button onClick={() => setShowDischarge(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                            Discharge Patient
                        </button>
                    )}
                    <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-4" /> Back
                    </button>
                </div>
            </PageHeader>

            {/* Patient & Admission Info */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border bg-white p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                        <User className="size-3.5" /> Patient
                    </h3>
                    <div className="space-y-1.5">
                        <p className="text-sm font-semibold">{admission.patients?.full_name || "Unknown"}</p>
                        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                            {admission.patients?.phone && <span className="flex items-center gap-1"><Phone className="size-3" /> {admission.patients.phone}</span>}
                            {admission.patients?.gender && <span>{admission.patients.gender}</span>}
                            {admission.patients?.date_of_birth && <span>DOB: {formatDate(admission.patients.date_of_birth)}</span>}
                        </div>
                        {admission.patients?.address && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <MapPin className="size-3" /> {admission.patients.address}
                            </p>
                        )}
                        {admission.patients?.emergency_contact_name && (
                            <p className="text-[10px] text-amber-600">
                                Emergency: {admission.patients.emergency_contact_name} ({admission.patients.emergency_contact_phone || "—"})
                            </p>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                        <BedDouble className="size-3.5" /> Admission Details
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <p className="text-[10px] text-muted-foreground">Ward</p>
                            <p className="font-medium">{admission.ward}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground">Bed</p>
                            <p className="font-medium">{admission.bed_number || "—"}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground">Admitted</p>
                            <p className="font-medium">{formatDateTime(admission.admission_date)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground">Days</p>
                            <p className="font-medium">{days} day{days !== 1 ? "s" : ""}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground">Doctor</p>
                            <p className="font-medium">{admission.doctor_name}</p>
                        </div>
                        {admission.discharge_date && (
                            <div>
                                <p className="text-[10px] text-muted-foreground">Discharged</p>
                                <p className="font-medium">{formatDateTime(admission.discharge_date)}</p>
                            </div>
                        )}
                    </div>
                    {admission.admission_reason && (
                        <div>
                            <p className="text-[10px] text-muted-foreground">Reason</p>
                            <p className="text-xs">{admission.admission_reason}</p>
                        </div>
                    )}
                    {admission.diagnosis && (
                        <div>
                            <p className="text-[10px] text-muted-foreground">Diagnosis</p>
                            <p className="text-xs font-medium text-primary">{admission.diagnosis}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Discharge Summary (if discharged) */}
            {admission.discharge_summary && (
                <div className="rounded-xl border bg-blue-50/50 p-4 space-y-2">
                    <h3 className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                        <FileText className="size-3.5" /> Discharge Summary
                    </h3>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{admission.discharge_summary}</p>
                    {admission.discharge_instructions && (
                        <div className="mt-2">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Instructions</p>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{admission.discharge_instructions}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Section Tabs */}
            <div className="flex items-center gap-1 rounded-xl border bg-white p-1">
                {[
                    { id: "vitals", label: "Vitals", icon: Heart },
                    { id: "medications", label: "Medications", icon: Pill },
                ].map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors flex-1 justify-center ${
                                activeSection === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                            }`}>
                            <Icon className="size-3.5" /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Vitals Section */}
            {activeSection === "vitals" && (
                <div className="space-y-3">
                    {isActive && (
                        <div className="flex justify-end">
                            <button onClick={() => { setShowVitalsForm(!showVitalsForm); setVitalsForm({}); setVitalsNotes(""); }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                                <Plus className="size-3.5" /> Record Vitals
                            </button>
                        </div>
                    )}

                    {showVitalsForm && (
                        <div className="rounded-xl border bg-white p-4 space-y-3">
                            <h4 className="text-xs font-semibold">Record Vital Signs</h4>
                            <div className="grid gap-2 sm:grid-cols-3">
                                {VITAL_FIELDS.map(f => (
                                    <div key={f.key}>
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase">{f.label} ({f.unit})</label>
                                        <input type="number" step="any" value={vitalsForm[f.key] || ""} onChange={e => handleVitalsChange(f.key, e.target.value)}
                                            placeholder={f.unit}
                                            className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-muted-foreground uppercase">Notes</label>
                                <input value={vitalsNotes} onChange={e => setVitalsNotes(e.target.value)}
                                    placeholder="Optional nursing notes..."
                                    className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowVitalsForm(false)} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50">Cancel</button>
                                <button onClick={handleSaveVitals} disabled={saving}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                                    {saving && <Loader2 className="size-3 animate-spin" />} Save
                                </button>
                            </div>
                        </div>
                    )}

                    {admission.vitals.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 rounded-xl border bg-white">
                            <Heart className="size-10 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No vitals recorded yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {admission.vitals.map(v => (
                                <div key={v.id} className="rounded-xl border bg-white p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="size-3" /> {formatDateTime(v.recorded_at)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {VITAL_FIELDS.filter(f => v.vital_signs?.[f.key]).map(f => (
                                            <div key={f.key} className="rounded-lg bg-muted/30 px-2 py-1.5">
                                                <p className="text-[9px] text-muted-foreground uppercase">{f.label}</p>
                                                <p className="text-xs font-semibold">{v.vital_signs[f.key]} <span className="text-[9px] font-normal text-muted-foreground">{f.unit}</span></p>
                                            </div>
                                        ))}
                                    </div>
                                    {v.notes && <p className="mt-2 text-[10px] text-muted-foreground italic">{v.notes}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Medications Section */}
            {activeSection === "medications" && (
                <div className="space-y-3">
                    {isActive && (
                        <div className="flex justify-end">
                            <button onClick={() => setShowMedForm(!showMedForm)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                                <Plus className="size-3.5" /> Add Medication
                            </button>
                        </div>
                    )}

                    {showMedForm && (
                        <div className="rounded-xl border bg-white p-4 space-y-3">
                            <h4 className="text-xs font-semibold">Add Medication</h4>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Medicine Name *</label>
                                    <input value={medForm.medicine_name} onChange={e => setMedForm(prev => ({ ...prev, medicine_name: e.target.value }))}
                                        placeholder="e.g. Paracetamol"
                                        className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Dosage</label>
                                    <input value={medForm.dosage} onChange={e => setMedForm(prev => ({ ...prev, dosage: e.target.value }))}
                                        placeholder="e.g. 500mg"
                                        className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Frequency</label>
                                    <select value={medForm.frequency} onChange={e => setMedForm(prev => ({ ...prev, frequency: e.target.value }))}
                                        className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                                        <option value="">Select</option>
                                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Route</label>
                                    <select value={medForm.route} onChange={e => setMedForm(prev => ({ ...prev, route: e.target.value }))}
                                        className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                                        {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowMedForm(false)} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50">Cancel</button>
                                <button onClick={handleSaveMed} disabled={saving}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                                    {saving && <Loader2 className="size-3 animate-spin" />} Add
                                </button>
                            </div>
                        </div>
                    )}

                    {admission.medications.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 rounded-xl border bg-white">
                            <Pill className="size-10 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No medications prescribed</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {admission.medications.map(m => (
                                <div key={m.id} className={`rounded-xl border bg-white p-4 ${!m.is_active ? "opacity-60" : ""}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold">{m.medicine_name}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {m.dosage && `${m.dosage} · `}
                                                {m.frequency && `${m.frequency} · `}
                                                {m.route || "oral"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                Start: {formatDate(m.start_date)}
                                                {m.end_date && ` · End: ${formatDate(m.end_date)}`}
                                            </p>
                                        </div>
                                        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            m.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                                        }`}>
                                            {m.is_active ? "Active" : "Stopped"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Discharge Modal */}
            {showDischarge && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold flex items-center gap-1.5">
                                <CheckCircle2 className="size-4 text-primary" /> Discharge Patient
                            </h3>
                            <button onClick={() => setShowDischarge(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="size-4" />
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Discharging <strong>{admission.patients?.full_name}</strong> from {admission.ward}
                            {admission.bed_number ? ` Bed ${admission.bed_number}` : ""} after {days} day{days !== 1 ? "s" : ""}.
                        </p>
                        <div>
                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Discharge Type</label>
                            <div className="mt-1 flex gap-2">
                                {["discharged", "transferred", "left_ama"].map(s => (
                                    <button key={s} type="button" onClick={() => setDischargeForm(prev => ({ ...prev, status: s }))}
                                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                            dischargeForm.status === s ? "bg-primary text-primary-foreground border-primary" : "bg-white text-muted-foreground hover:bg-muted/50"
                                        }`}>
                                        {s === "left_ama" ? "Left AMA" : s.charAt(0).toUpperCase() + s.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Discharge Summary *</label>
                            <textarea value={dischargeForm.discharge_summary} onChange={e => setDischargeForm(prev => ({ ...prev, discharge_summary: e.target.value }))}
                                rows={4} placeholder="Summary of admission, treatment given, and outcome..."
                                className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Discharge Instructions</label>
                            <textarea value={dischargeForm.discharge_instructions} onChange={e => setDischargeForm(prev => ({ ...prev, discharge_instructions: e.target.value }))}
                                rows={3} placeholder="Medications to continue, follow-up instructions..."
                                className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <button onClick={() => setShowDischarge(false)} className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted/50">Cancel</button>
                            <button onClick={handleDischarge} disabled={saving || !dischargeForm.discharge_summary}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                                {saving && <Loader2 className="size-3 animate-spin" />} Confirm Discharge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, BedDouble } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getAdmissionService } from "@/features/admissions/services/admission.service";
import { getPatientService } from "@/features/patients/services/patient.service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const WARDS = ["General", "Maternity", "Pediatric", "ICU", "Emergency", "Surgical", "Isolation", "VIP"];

export default function NewAdmissionPage() {
    const navigate = useNavigate();
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getAdmissionService(), []);
    const patientService = useMemo(() => getPatientService(), []);

    const [patients, setPatients] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        ward: "",
        bed_number: "",
        admission_reason: "",
        diagnosis: "",
    });

    const searchPatients = useCallback(async (q) => {
        if (!clinicId || !q || q.trim().length < 2) { setSearchResults([]); return; }
        setLoading(true);
        try {
            const results = await patientService.searchPatients(clinicId, q);
            setSearchResults(results);
        } catch {
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    }, [clinicId, patientService]);

    useEffect(() => {
        const timer = setTimeout(() => searchPatients(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchPatients]);

    const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!clinicId || !user || !selectedPatient) {
            toast.error("Please select a patient");
            return;
        }
        if (!form.ward) {
            toast.error("Please select a ward");
            return;
        }
        setSaving(true);
        try {
            const id = await service.admitPatient(clinicId, {
                patient_id: selectedPatient.id,
                ward: form.ward,
                bed_number: form.bed_number || null,
                admission_reason: form.admission_reason || null,
                diagnosis: form.diagnosis || null,
                attending_doctor: null,
            }, user.id);
            toast.success("Patient admitted successfully");
            navigate(`/admissions/${id}`);
        } catch (err) {
            toast.error(handleApiError(err, "Failed to admit patient"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <PageHeader title="New Admission">
                <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="size-4" /> Back
                </button>
            </PageHeader>

            <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-5 space-y-5">
                {/* Patient Selection */}
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Patient *</label>
                    {selectedPatient ? (
                        <div className="mt-2 flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {selectedPatient.full_name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{selectedPatient.full_name}</p>
                                <p className="text-[10px] text-muted-foreground">{selectedPatient.phone || "No phone"} · {selectedPatient.gender || "—"}</p>
                            </div>
                            <button type="button" onClick={() => { setSelectedPatient(null); setSearchQuery(""); }}
                                className="rounded-lg border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/50">
                                Change
                            </button>
                        </div>
                    ) : (
                        <div className="mt-2">
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search patient by name or phone..."
                                className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                            {loading && <p className="mt-1 text-[10px] text-muted-foreground">Searching...</p>}
                            {searchResults.length > 0 && (
                                <div className="mt-1 rounded-lg border bg-white shadow-sm max-h-48 overflow-y-auto">
                                    {searchResults.map(p => (
                                        <button key={p.id} type="button"
                                            onClick={() => { setSelectedPatient(p); setSearchQuery(""); setSearchResults([]); }}
                                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors border-b last:border-0">
                                            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                                {p.full_name?.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium truncate">{p.full_name}</p>
                                                <p className="text-[10px] text-muted-foreground">{p.phone || "No phone"}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {searchQuery.length >= 2 && !loading && searchResults.length === 0 && (
                                <p className="mt-1 text-[10px] text-muted-foreground">No patients found. <Link to="/patients/new" className="text-primary hover:underline">Add new patient</Link></p>
                            )}
                        </div>
                    )}
                </div>

                {/* Ward */}
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Ward *</label>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                        {WARDS.map(w => (
                            <button key={w} type="button" onClick={() => handleChange("ward", w)}
                                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-center ${
                                    form.ward === w ? "bg-primary text-primary-foreground border-primary" : "bg-white text-muted-foreground hover:bg-muted/50"
                                }`}>
                                {w}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bed Number */}
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Bed Number</label>
                    <input value={form.bed_number} onChange={e => handleChange("bed_number", e.target.value)}
                        placeholder="e.g. A-12"
                        className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                {/* Admission Reason */}
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Admission Reason</label>
                    <textarea value={form.admission_reason} onChange={e => handleChange("admission_reason", e.target.value)}
                        rows={3} placeholder="Reason for admission..."
                        className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>

                {/* Diagnosis */}
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Initial Diagnosis</label>
                    <input value={form.diagnosis} onChange={e => handleChange("diagnosis", e.target.value)}
                        placeholder="e.g. Pneumonia, Dehydration"
                        className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                {/* Submit */}
                <div className="flex items-center gap-3 pt-2 border-t">
                    <button type="submit" disabled={saving || !selectedPatient || !form.ward}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <BedDouble className="size-4" />}
                        Admit Patient
                    </button>
                    <button type="button" onClick={() => navigate(-1)}
                        className="rounded-lg border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

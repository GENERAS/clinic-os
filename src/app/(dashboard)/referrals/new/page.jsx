"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRightLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getReferralService } from "@/features/referrals/services/referral.service";
import { getPatientService } from "@/features/patients/services/patient.service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

export default function NewReferralPage() {
    const navigate = useNavigate();
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getReferralService(), []);
    const patientService = useMemo(() => getPatientService(), []);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        referral_type: "external",
        to_provider: "",
        to_facility: "",
        reason: "",
        clinical_summary: "",
        diagnosis: "",
        tests_done: "",
        treatment_given: "",
        urgency: "normal",
        notes: "",
    });

    const searchPatients = useCallback(async (q) => {
        if (!clinicId || !q || q.trim().length < 2) { setSearchResults([]); return; }
        setLoading(true);
        try {
            const results = await patientService().searchPatients(clinicId, q);
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
        if (!clinicId || !user || !selectedPatient) { toast.error("Please select a patient"); return; }
        if (!form.to_provider) { toast.error("Provider name is required"); return; }
        if (!form.reason) { toast.error("Reason for referral is required"); return; }
        setSaving(true);
        try {
            const id = await service().createReferral(clinicId, {
                patient_id: selectedPatient.id,
                referral_type: form.referral_type,
                to_provider: form.to_provider,
                to_facility: form.to_facility || null,
                reason: form.reason,
                clinical_summary: form.clinical_summary || null,
                diagnosis: form.diagnosis || null,
                tests_done: form.tests_done || null,
                treatment_given: form.treatment_given || null,
                urgency: form.urgency,
                notes: form.notes || null,
            }, user.id);
            toast.success("Referral created successfully");
            navigate("/referrals");
        } catch (err) {
            toast.error(handleApiError(err, "Failed to create referral"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <PageHeader title="New Referral">
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

                {/* Referral Type */}
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Referral Type *</label>
                    <div className="mt-2 flex gap-2">
                        {["internal", "external"].map(t => (
                            <button key={t} type="button" onClick={() => handleChange("referral_type", t)}
                                className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                                    form.referral_type === t ? "bg-primary text-primary-foreground border-primary" : "bg-white text-muted-foreground hover:bg-muted/50"
                                }`}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Urgency */}
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Urgency</label>
                    <div className="mt-2 flex gap-2">
                        {[
                            { value: "urgent", label: "Urgent", color: "bg-red-50 text-red-700 border-red-200" },
                            { value: "normal", label: "Normal", color: "bg-gray-50 text-gray-700 border-gray-200" },
                            { value: "follow_up", label: "Follow-up", color: "bg-blue-50 text-blue-700 border-blue-200" },
                        ].map(u => (
                            <button key={u.value} type="button" onClick={() => handleChange("urgency", u.value)}
                                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                                    form.urgency === u.value ? u.color + " ring-2 ring-primary/20" : "bg-white text-muted-foreground hover:bg-muted/50"
                                }`}>
                                {u.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* To Provider */}
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">To Provider *</label>
                    <input value={form.to_provider} onChange={e => handleChange("to_provider", e.target.value)}
                        placeholder={form.referral_type === "internal" ? "e.g. Dr. Smith" : "e.g. Dr. Johnson, Kigali Hospital"}
                        className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                {/* To Facility (external only) */}
                {form.referral_type === "external" && (
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Facility</label>
                        <input value={form.to_facility} onChange={e => handleChange("to_facility", e.target.value)}
                            placeholder="e.g. King Faisal Hospital"
                            className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                )}

                {/* Reason */}
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Reason for Referral *</label>
                    <textarea value={form.reason} onChange={e => handleChange("reason", e.target.value)} rows={2}
                        placeholder="Why is this referral being made?"
                        className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>

                {/* Diagnosis */}
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Diagnosis</label>
                    <input value={form.diagnosis} onChange={e => handleChange("diagnosis", e.target.value)}
                        placeholder="e.g. Suspected appendicitis"
                        className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                {/* Clinical Summary */}
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Clinical Summary</label>
                    <textarea value={form.clinical_summary} onChange={e => handleChange("clinical_summary", e.target.value)} rows={3}
                        placeholder="Relevant history, findings, and clinical picture..."
                        className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {/* Tests Done */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Tests Done</label>
                        <textarea value={form.tests_done} onChange={e => handleChange("tests_done", e.target.value)} rows={2}
                            placeholder="Investigations performed..."
                            className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                    </div>

                    {/* Treatment Given */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Treatment Given</label>
                        <textarea value={form.treatment_given} onChange={e => handleChange("treatment_given", e.target.value)} rows={2}
                            placeholder="Treatment provided so far..."
                            className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Additional Notes</label>
                    <input value={form.notes} onChange={e => handleChange("notes", e.target.value)}
                        placeholder="Any other relevant information..."
                        className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                {/* Submit */}
                <div className="flex items-center gap-3 pt-2 border-t">
                    <button type="submit" disabled={saving || !selectedPatient}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}
                        Create Referral
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

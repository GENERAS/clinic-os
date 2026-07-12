"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getRadiologyService } from "@/features/radiology/services/radiology.service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const MODALITIES = [
    { value: "xray", label: "X-Ray" },
    { value: "ultrasound", label: "Ultrasound" },
    { value: "ct", label: "CT Scan" },
    { value: "mri", label: "MRI" },
    { value: "ecg", label: "ECG / EKG" },
    { value: "echo", label: "Echocardiogram" },
    { value: "fluoroscopy", label: "Fluoroscopy" },
    { value: "mammography", label: "Mammography" },
    { value: "dexa", label: "DEXA Scan" },
    { value: "other", label: "Other" },
];

const BODY_PARTS = {
    xray: ["Chest (PA/Lateral)", "Chest (AP)", "Abdomen", "Pelvis", "Spine (Cervical)", "Spine (Thoracic)", "Spine (Lumbar)", "Skull", "Sinuses", "Shoulder", "Elbow", "Wrist/Hand", "Hip", "Knee", "Ankle/Foot", "Rib cage", "Other"],
    ultrasound: ["Abdomen", "Pelvis", "Obstetric", "Thyroid", "Breast", "Scrotal", "Renal", "Liver", "Gallbladder", "Pancreas", "Spleen", "Aorta", "Doppler (Carotid)", "Doppler (Lower limbs)", "Other"],
    ct: ["Head", "Neck", "Chest", "Abdomen", "Pelvis", "Spine", "Extremity", "Angiography (Pulmonary)", "Angiography (Abdominal)", "Other"],
    mri: ["Brain", "Spine (Cervical)", "Spine (Thoracic)", "Spine (Lumbar)", "Knee", "Shoulder", "Hip", "Abdomen", "Pelvis", "Heart (Cardiac)", "Other"],
    ecg: ["Standard 12-lead", "Holter monitoring", "Other"],
    echo: ["Transthoracic (TTE)", "Transesophageal (TEE)", "Stress echo", "Other"],
    fluoroscopy: ["Barium swallow", "Barium meal", "Barium enema", "IVU/IVP", "Other"],
    mammography: ["Screening", "Diagnostic", "Bilateral", "Unilateral", "Other"],
    dexa: ["Lumbar spine", "Hip", "Forearm", "Whole body", "Other"],
    other: ["Other"],
};

const URGENCY_OPTIONS = [
    { value: "routine", label: "Routine" },
    { value: "urgent", label: "Urgent" },
    { value: "stat", label: "STAT (Immediate)" },
];

export default function NewRadiologyOrderPage() {
    const navigate = useNavigate();
    const { clinic: authClinic, user } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getRadiologyService(), []);

    const [patients, setPatients] = useState([]);
    const [patientSearch, setPatientSearch] = useState("");
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [modality, setModality] = useState("xray");
    const [bodyPart, setBodyPart] = useState("");
    const [customBodyPart, setCustomBodyPart] = useState("");
    const [clinicalIndication, setClinicalIndication] = useState("");
    const [urgency, setUrgency] = useState("routine");
    const [specialInstructions, setSpecialInstructions] = useState("");
    const [saving, setSaving] = useState(false);
    const [loadingPatients, setLoadingPatients] = useState(true);

    useEffect(() => {
        if (!clinicId) return;
        setLoadingPatients(true);
        service.getPatients(clinicId).then(data => {
            setPatients(data);
            setLoadingPatients(false);
        }).catch(() => setLoadingPatients(false));
    }, [clinicId, service]);

    const filteredPatients = useMemo(() => {
        if (!patientSearch.trim()) return patients.slice(0, 20);
        const q = patientSearch.toLowerCase();
        return patients.filter(p => (p.full_name || "").toLowerCase().includes(q) || (p.phone || "").includes(q)).slice(0, 20);
    }, [patients, patientSearch]);

    const availableBodyParts = BODY_PARTS[modality] || BODY_PARTS.other;

    useEffect(() => {
        setBodyPart("");
        setCustomBodyPart("");
    }, [modality]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!selectedPatient) { toast.error("Select a patient"); return; }
        if (!bodyPart && !customBodyPart) { toast.error("Select or enter a body part"); return; }
        if (!clinicalIndication.trim()) { toast.error("Clinical indication is required"); return; }

        setSaving(true);
        try {
            const order = await service.createOrder(clinicId, {
                patient_id: selectedPatient.id,
                modality,
                body_part: bodyPart === "Other" ? customBodyPart : bodyPart,
                clinical_indication: clinicalIndication,
                urgency,
                special_instructions: specialInstructions || null,
            }, user.id);
            toast.success("Radiology order created");
            navigate(`/radiology/${order.id}`);
        } catch (err) {
            toast.error(handleApiError(err, "Failed to create order"));
        } finally {
            setSaving(false);
        }
    }, [clinicId, selectedPatient, modality, bodyPart, customBodyPart, clinicalIndication, urgency, specialInstructions, user, service, navigate]);

    const inputClass = "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";
    const labelClass = "text-[10px] font-medium text-muted-foreground uppercase";

    return (
        <div className="mx-auto max-w-2xl space-y-5">
            <PageHeader title="New Radiology Order">
                <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="size-4" /> Back
                </button>
            </PageHeader>

            <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-5 space-y-5">
                <div>
                    <label className={labelClass}>Patient *</label>
                    {selectedPatient ? (
                        <div className="mt-1 flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                            <span className="text-sm font-medium flex-1">{selectedPatient.full_name}</span>
                            {selectedPatient.phone && <span className="text-xs text-muted-foreground">{selectedPatient.phone}</span>}
                            <button type="button" onClick={() => { setSelectedPatient(null); setPatientSearch(""); }} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
                        </div>
                    ) : (
                        <div className="mt-1 space-y-1">
                            <input value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search patient by name or phone..." className={inputClass} />
                            {filteredPatients.length > 0 && (
                                <div className="max-h-40 overflow-y-auto rounded-lg border bg-white shadow-sm">
                                    {filteredPatients.map(p => (
                                        <button key={p.id} type="button" onClick={() => { setSelectedPatient(p); setPatientSearch(""); }} className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 text-left">
                                            <span className="font-medium">{p.full_name}</span>
                                            <span className="text-xs text-muted-foreground">{p.phone || ""}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className={labelClass}>Modality *</label>
                        <select value={modality} onChange={(e) => setModality(e.target.value)} className={`mt-1 ${inputClass}`}>
                            {MODALITIES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Urgency *</label>
                        <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className={`mt-1 ${inputClass}`}>
                            {URGENCY_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Body Part *</label>
                    <select value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} className={`mt-1 ${inputClass}`}>
                        <option value="">Select body part...</option>
                        {availableBodyParts.map(bp => <option key={bp} value={bp}>{bp}</option>)}
                    </select>
                    {bodyPart === "Other" && (
                        <input value={customBodyPart} onChange={(e) => setCustomBodyPart(e.target.value)} placeholder="Specify body part..." className={`mt-2 ${inputClass}`} />
                    )}
                </div>

                <div>
                    <label className={`${labelClass} text-red-600`}>Clinical Indication *</label>
                    <textarea value={clinicalIndication} onChange={(e) => setClinicalIndication(e.target.value)} rows={3} className={`mt-1 ${inputClass}`} placeholder="Reason for the examination, relevant clinical history, symptoms..." />
                </div>

                <div>
                    <label className={labelClass}>Special Instructions</label>
                    <textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows={2} className={`mt-1 ${inputClass}`} placeholder="e.g. Fasting required, pregnant, contrast allergy..." />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => navigate(-1)} className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">Cancel</button>
                    <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50">
                        {saving && <Loader2 className="size-3.5 animate-spin" />}
                        Create Order
                    </button>
                </div>
            </form>
        </div>
    );
}

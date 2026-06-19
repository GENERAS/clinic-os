"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2, X, Search, ChevronDown, Stethoscope, PillBottle, FlaskConical } from "lucide-react";
import { COMMON_DIAGNOSES, COMMON_MEDICINES, COMMON_INVESTIGATIONS, COMMON_COMPLAINTS, FREQUENCY_OPTIONS, MEDICINE_FORMS, MEDICINE_ROUTES } from "@/features/consultations/services/rwanda-seed-data";

function SimpleSelect({ options, value, onChange, placeholder, search }) {
    const [open, setOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const filtered = useMemo(() => {
        if (!search || !searchText) return options;
        const q = searchText.toLowerCase();
        return options.filter(o => {
            const label = o.label || o.name || o.description || o.value || "";
            return label.toLowerCase().includes(q);
        });
    }, [options, searchText, search]);

    const selected = options.find(o =>
        (o.label || o.name || o.description || o.value) === value ||
        o.value === value
    );

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
            >
                <span className={selected ? "" : "text-muted-foreground"}>
                    {selected ? (selected.label || selected.name || selected.description || selected.value) : (placeholder || "Select...")}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-full z-20 mt-1 w-full min-w-[240px] rounded-lg border bg-white shadow-lg">
                        {search && (
                            <div className="border-b p-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        autoFocus
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        className="w-full rounded-md border py-1.5 pl-8 pr-3 text-sm"
                                        placeholder="Search..."
                                    />
                                </div>
                            </div>
                        )}
                        <div className="max-h-[200px] overflow-y-auto p-1">
                            {filtered.length === 0 ? (
                                <p className="px-2 py-4 text-center text-xs text-muted-foreground">No results</p>
                            ) : (
                                filtered.map((opt, i) => {
                                    const label = opt.label || opt.name || opt.description || opt.value || "";
                                    const val = opt.value || opt.name || opt.description || "";
                                    const sub = opt.strength || opt.icd_code || opt.category || "";
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => { onChange(val, opt); setOpen(false); setSearchText(""); }}
                                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${value === val ? "bg-primary/10 text-primary" : ""}`}
                                        >
                                            <span className="flex-1">{label}</span>
                                            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function DiagnosisSection({ diagnoses, onChange }) {
    const addDiag = () => {
        onChange([...diagnoses, { description: "", icd_code: "", type: "primary", notes: "" }]);
    };
    const updateDiag = (idx, field, value) => {
        const updated = diagnoses.map((d, i) => i === idx ? { ...d, [field]: value } : d);
        onChange(updated);
    };
    const removeDiag = (idx) => {
        onChange(diagnoses.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Stethoscope className="size-4" />
                    Diagnosis
                </h4>
                <button type="button" onClick={addDiag} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
                    <Plus className="size-3" /> Add diagnosis
                </button>
            </div>
            {diagnoses.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No diagnoses added yet.</p>
            )}
            {diagnoses.map((diag, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
                    <div className="flex-1 space-y-2">
                        <SimpleSelect
                            search
                            options={COMMON_DIAGNOSES.map(d => ({ value: d.description, label: d.description, sub: d.icd_code }))}
                            value={diag.description}
                            onChange={(val) => {
                                const match = COMMON_DIAGNOSES.find(d => d.description === val);
                                updateDiag(i, "description", val);
                                if (match) updateDiag(i, "icd_code", match.icd_code);
                            }}
                            placeholder="Search diagnosis..."
                        />
                        <div className="flex gap-2">
                            <select
                                value={diag.type}
                                onChange={(e) => updateDiag(i, "type", e.target.value)}
                                className="rounded-lg border px-2 py-1 text-xs"
                            >
                                <option value="primary">Primary</option>
                                <option value="secondary">Secondary</option>
                                <option value="differential">Differential</option>
                            </select>
                            {diag.icd_code && (
                                <span className="self-center text-xs text-muted-foreground">ICD-10: {diag.icd_code}</span>
                            )}
                        </div>
                        <input
                            value={diag.notes || ""}
                            onChange={(e) => updateDiag(i, "notes", e.target.value)}
                            className="w-full rounded-lg border px-3 py-1.5 text-xs"
                            placeholder="Notes (optional)"
                        />
                    </div>
                    <button type="button" onClick={() => removeDiag(i)} className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}

function PrescriptionSection({ prescriptions, onChange }) {
    const addRx = () => {
        onChange([...prescriptions, { medicine_name: "", strength: "", form: "", dosage: "", frequency: "", duration: "", quantity: "", route: "oral", notes: "" }]);
    };
    const updateRx = (idx, field, value) => {
        const updated = prescriptions.map((p, i) => i === idx ? { ...p, [field]: value } : p);
        onChange(updated);
    };
    const removeRx = (idx) => {
        onChange(prescriptions.filter((_, i) => i !== idx));
    };

    const handleMedicineSelect = (idx, val, opt) => {
        updateRx(idx, "medicine_name", val);
        if (opt?.strength) updateRx(idx, "strength", opt.strength);
        if (opt?.form) updateRx(idx, "form", opt.form);
    };

    const freqLabels = {};
    FREQUENCY_OPTIONS.forEach(f => { freqLabels[f.value] = f.label; });

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <PillBottle className="size-4" />
                    Prescription
                </h4>
                <button type="button" onClick={addRx} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
                    <Plus className="size-3" /> Add medicine
                </button>
            </div>
            {prescriptions.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No medicines prescribed yet.</p>
            )}
            {prescriptions.map((rx, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <SimpleSelect
                                search
                                options={COMMON_MEDICINES.map(m => ({ value: m.name, label: m.name, strength: m.strength }))}
                                value={rx.medicine_name}
                                onChange={(val, opt) => handleMedicineSelect(i, val, opt)}
                                placeholder="Search medicine..."
                            />
                        </div>
                        <button type="button" onClick={() => removeRx(i)} className="shrink-0 self-start text-muted-foreground hover:text-red-500 transition-colors">
                            <Trash2 className="size-3.5 mt-2" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        <input
                            value={rx.strength}
                            onChange={(e) => updateRx(i, "strength", e.target.value)}
                            className="rounded-lg border px-3 py-1.5 text-xs"
                            placeholder="Strength (e.g. 500mg)"
                        />
                        <select
                            value={rx.form}
                            onChange={(e) => updateRx(i, "form", e.target.value)}
                            className="rounded-lg border px-3 py-1.5 text-xs"
                        >
                            <option value="">Form</option>
                            {MEDICINE_FORMS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                        <input
                            value={rx.dosage}
                            onChange={(e) => updateRx(i, "dosage", e.target.value)}
                            className="rounded-lg border px-3 py-1.5 text-xs"
                            placeholder="Dosage (e.g. 1 tablet)"
                        />
                        <select
                            value={rx.frequency}
                            onChange={(e) => updateRx(i, "frequency", e.target.value)}
                            className="rounded-lg border px-3 py-1.5 text-xs"
                        >
                            <option value="">Frequency</option>
                            {FREQUENCY_OPTIONS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                        <input
                            value={rx.duration}
                            onChange={(e) => updateRx(i, "duration", e.target.value)}
                            className="rounded-lg border px-3 py-1.5 text-xs"
                            placeholder="Duration (e.g. 7 days)"
                        />
                        <input
                            value={rx.quantity}
                            onChange={(e) => updateRx(i, "quantity", e.target.value)}
                            className="rounded-lg border px-3 py-1.5 text-xs"
                            placeholder="Quantity"
                            type="number"
                            min="1"
                        />
                        <select
                            value={rx.route}
                            onChange={(e) => updateRx(i, "route", e.target.value)}
                            className="rounded-lg border px-3 py-1.5 text-xs"
                        >
                            {MEDICINE_ROUTES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                        <input
                            value={rx.notes || ""}
                            onChange={(e) => updateRx(i, "notes", e.target.value)}
                            className="rounded-lg border px-3 py-1.5 text-xs"
                            placeholder="Instructions"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function InvestigationSection({ investigations, onChange }) {
    const addInv = () => {
        onChange([...investigations, { test_name: "", category: "", instructions: "" }]);
    };
    const updateInv = (idx, field, value) => {
        const updated = investigations.map((i, n) => n === idx ? { ...i, [field]: value } : i);
        onChange(updated);
    };
    const removeInv = (idx) => {
        onChange(investigations.filter((_, i) => i !== idx));
    };

    const handleSelect = (idx, val, opt) => {
        updateInv(idx, "test_name", val);
        if (opt?.category) updateInv(idx, "category", opt.category);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <FlaskConical className="size-4" />
                    Investigations
                </h4>
                <button type="button" onClick={addInv} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
                    <Plus className="size-3" /> Add investigation
                </button>
            </div>
            {investigations.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No investigations ordered.</p>
            )}
            {investigations.map((inv, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
                    <div className="flex-1 space-y-2">
                        <SimpleSelect
                            search
                            options={COMMON_INVESTIGATIONS.map(t => ({ value: t.name, label: t.name, category: t.category }))}
                            value={inv.test_name}
                            onChange={(val, opt) => handleSelect(i, val, opt)}
                            placeholder="Search investigation..."
                        />
                        {inv.category && (
                            <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                                {inv.category}
                            </span>
                        )}
                        <input
                            value={inv.instructions || ""}
                            onChange={(e) => updateInv(i, "instructions", e.target.value)}
                            className="w-full rounded-lg border px-3 py-1.5 text-xs"
                            placeholder="Special instructions for patient (e.g. Fasting required)"
                        />
                    </div>
                    <button type="button" onClick={() => removeInv(i)} className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}

export function VitalSignsInput({ vitalSigns, onChange, onBlur }) {
    const fields = [
        { key: "bp_systolic", label: "BP Systolic", unit: "mmHg", col: "1/2" },
        { key: "bp_diastolic", label: "BP Diastolic", unit: "mmHg", col: "1/2" },
        { key: "pulse", label: "Pulse", unit: "bpm", col: "1/3" },
        { key: "temperature", label: "Temp", unit: "°C", col: "1/3" },
        { key: "weight", label: "Weight", unit: "kg", col: "1/3" },
        { key: "height", label: "Height", unit: "cm", col: "1/3" },
        { key: "respiratory_rate", label: "RR", unit: "/min", col: "1/3" },
        { key: "spo2", label: "SpO₂", unit: "%", col: "1/3" },
    ];

    const weight = parseFloat(vitalSigns?.weight) || 0;
    const height = parseFloat(vitalSigns?.height) || 0;
    const bmi = weight > 0 && height > 0 ? (weight / ((height / 100) ** 2)).toFixed(1) : null;

    return (
        <div className="rounded-lg border bg-muted/20 p-4">
            <h4 className="mb-3 text-sm font-semibold">Vital Signs</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {fields.map((f) => (
                    <div key={f.key}>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {f.label} <span className="text-[10px]">({f.unit})</span>
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={vitalSigns?.[f.key] ?? ""}
                            onChange={(e) => onChange({ ...vitalSigns, [f.key]: e.target.value })}
                            onBlur={onBlur}
                            className="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                            min="0"
                        />
                    </div>
                ))}
            </div>
            {bmi && (
                <div className="mt-2 text-xs text-muted-foreground">
                    BMI: <span className="font-semibold text-foreground">{bmi}</span> kg/m²
                    {bmi >= 30 && " (Obese)"}
                    {bmi >= 25 && bmi < 30 && " (Overweight)"}
                    {bmi >= 18.5 && bmi < 25 && " (Normal)"}
                    {bmi < 18.5 && " (Underweight)"}
                </div>
            )}
        </div>
    );
}

export function ComplaintQuickSelect({ value, onChange }) {
    const [show, setShow] = useState(false);
    const selected = COMMON_COMPLAINTS.filter(c => value.includes(c));

    return (
        <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
                {selected.map(s => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => onChange(value.filter(v => v !== s))}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                        {s} <X className="size-2.5" />
                    </button>
                ))}
            </div>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Plus className="size-3" /> Quick add complaint
                </button>
                {show && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShow(false)} />
                        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border bg-white p-2 shadow-lg">
                            <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                                {COMMON_COMPLAINTS.filter(c => !value.includes(c)).map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => { onChange([...value, c]); setShow(false); }}
                                        className="w-full rounded-md px-3 py-1.5 text-left text-xs hover:bg-muted/50 transition-colors"
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export function ConsultationForm({ patient, doctorName, initialData, onSave, onComplete, onCancel, saving }) {
    const [chiefComplaint, setChiefComplaint] = useState(initialData?.chief_complaint || "");
    const [hpi, setHpi] = useState(initialData?.history_of_presenting_illness || "");
    const [vitalSigns, setVitalSigns] = useState(initialData?.vital_signs || {});
    const [physicalExam, setPhysicalExam] = useState(initialData?.physical_examination || "");
    const [assessment, setAssessment] = useState(initialData?.assessment || "");
    const [treatmentPlan, setTreatmentPlan] = useState(initialData?.treatment_plan || "");
    const [followUpInstructions, setFollowUpInstructions] = useState(initialData?.follow_up_instructions || "");
    const [followUpDate, setFollowUpDate] = useState(initialData?.follow_up_date || "");
    const [sickLeaveDays, setSickLeaveDays] = useState(initialData?.sick_leave_days || 0);
    const [diagnoses, setDiagnoses] = useState(initialData?.diagnoses?.map(d => ({ description: d.description || d, icd_code: d.icd_code || "", type: d.type || "primary", notes: d.notes || "" })) || []);
    const [prescriptions, setPrescriptions] = useState(initialData?.prescriptions?.map(p => ({
        medicine_name: p.medicine_name, strength: p.strength || "", form: p.form || "",
        dosage: p.dosage || "", frequency: p.frequency || "", duration: p.duration || "",
        quantity: p.quantity || "", route: p.route || "oral", notes: p.notes || ""
    })) || []);
    const [investigations, setInvestigations] = useState(initialData?.investigations?.map(i => ({
        test_name: i.test_name, category: i.category || "", instructions: i.instructions || ""
    })) || []);

    const [selectedComplaints, setSelectedComplaints] = useState(
        chiefComplaint ? chiefComplaint.split(";").map(s => s.trim()).filter(Boolean) : []
    );

    const handleChiefComplaintChange = (list) => {
        setSelectedComplaints(list);
        setChiefComplaint(list.join("; "));
    };

    const collectData = () => ({
        patient_id: patient?.id,
        appointment_id: initialData?.appointment_id,
        chief_complaint: chiefComplaint,
        history_of_presenting_illness: hpi,
        vital_signs: vitalSigns,
        physical_examination: physicalExam,
        assessment: assessment,
        treatment_plan: treatmentPlan,
        follow_up_instructions: followUpInstructions,
        follow_up_date: followUpDate || null,
        sick_leave_days: parseInt(sickLeaveDays) || 0,
    });

    const handleSave = () => onSave(collectData(), diagnoses, prescriptions, investigations);
    const handleComplete = () => onComplete(collectData(), diagnoses, prescriptions, investigations);

    const today = new Date().toISOString().split("T")[0];

    return (
        <div className="space-y-6">
            <div className="rounded-lg border bg-muted/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-lg font-semibold">{patient?.full_name || "Patient"}</h3>
                        <p className="text-xs text-muted-foreground">
                            {patient?.gender && `${patient.gender} · `}
                            {patient?.date_of_birth && `Age ${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} · `}
                            {patient?.phone && `📞 ${patient.phone}`}
                        </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                        <p>Doctor: <span className="font-medium text-foreground">{doctorName}</span></p>
                        <p>Date: <span className="font-medium text-foreground">{new Date().toLocaleDateString("en-RW", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</span></p>
                    </div>
                </div>
            </div>

            <section className="space-y-4">
                <VitalSignsInput vitalSigns={vitalSigns} onChange={setVitalSigns} />
            </section>

            <section className="space-y-3">
                <h4 className="text-sm font-semibold">Subjective</h4>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Chief Complaint</label>
                    <input
                        value={chiefComplaint}
                        onChange={(e) => { setChiefComplaint(e.target.value); setSelectedComplaints(e.target.value.split(";").map(s => s.trim()).filter(Boolean)); }}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="e.g. Fever, headache, body weakness"
                    />
                    <ComplaintQuickSelect value={selectedComplaints} onChange={handleChiefComplaintChange} />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">History of Presenting Illness</label>
                    <textarea
                        value={hpi}
                        onChange={(e) => setHpi(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="Onset, duration, severity, associated symptoms, what makes it better/worse..."
                    />
                </div>
            </section>

            <section className="space-y-3">
                <h4 className="text-sm font-semibold">Objective</h4>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Physical Examination Findings</label>
                    <textarea
                        value={physicalExam}
                        onChange={(e) => setPhysicalExam(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="General appearance, HEENT, chest, abdomen, extremities, neurological..."
                    />
                </div>
            </section>

            <section className="space-y-3">
                <DiagnosisSection diagnoses={diagnoses} onChange={setDiagnoses} />
            </section>

            <section className="space-y-3">
                <PrescriptionSection prescriptions={prescriptions} onChange={setPrescriptions} />
            </section>

            <section className="space-y-3">
                <InvestigationSection investigations={investigations} onChange={setInvestigations} />
            </section>

            <section className="space-y-3">
                <h4 className="text-sm font-semibold">Assessment & Plan</h4>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Assessment / Clinical Impression</label>
                    <textarea
                        value={assessment}
                        onChange={(e) => setAssessment(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="Doctor's assessment..."
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Treatment Plan</label>
                    <textarea
                        value={treatmentPlan}
                        onChange={(e) => setTreatmentPlan(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="Management plan, referrals, procedures..."
                    />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Follow-up Date</label>
                        <input
                            type="date"
                            value={followUpDate}
                            onChange={(e) => setFollowUpDate(e.target.value)}
                            min={today}
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Sick Leave (days)</label>
                        <input
                            type="number"
                            value={sickLeaveDays}
                            onChange={(e) => setSickLeaveDays(parseInt(e.target.value) || 0)}
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                            min="0"
                            max="365"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Instructions for Patient</label>
                        <input
                            value={followUpInstructions}
                            onChange={(e) => setFollowUpInstructions(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                            placeholder="e.g. Return if fever persists"
                        />
                    </div>
                </div>
            </section>

            <div className="flex items-center justify-between gap-3 border-t pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                    disabled={saving}
                >
                    Cancel
                </button>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                    >
                        {saving ? "Saving..." : "Save Draft"}
                    </button>
                    <button
                        type="button"
                        onClick={handleComplete}
                        disabled={saving}
                        className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        {saving ? "Saving..." : "Complete Consultation"}
                    </button>
                </div>
            </div>
        </div>
    );
}

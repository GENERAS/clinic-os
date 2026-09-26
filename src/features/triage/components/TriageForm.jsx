"use client";
import { useCallback, useMemo, useState } from "react";
import { Loader2, Heart, AlertTriangle, Pill, Stethoscope, Activity, Thermometer, Weight, Ruler } from "lucide-react";
import { VITAL_RANGES, computeBmi } from "@/lib/validation";
import { validateTriage, triageVitalPayload } from "@/features/triage/schemas/triage.schema";

const URGENCY_OPTIONS = [
    { value: "emergency", label: "Emergency", color: "text-red-600 bg-red-50 border-red-200" },
    { value: "urgent", label: "Urgent", color: "text-amber-600 bg-amber-50 border-amber-200" },
    { value: "routine", label: "Routine", color: "text-blue-600 bg-blue-50 border-blue-200" },
    { value: "non_urgent", label: "Non-Urgent", color: "text-gray-600 bg-gray-50 border-gray-200" },
];

const VITAL_FIELDS = [
    { key: "systolic_bp", icon: Activity },
    { key: "diastolic_bp", icon: Activity },
    { key: "heart_rate", icon: Heart },
    { key: "temperature", icon: Thermometer },
    { key: "respiratory_rate", icon: Stethoscope },
    { key: "oxygen_saturation", icon: Activity },
    { key: "weight", icon: Weight },
    { key: "height", icon: Ruler },
];

function VitalInput({ icon: Icon, label, value, onChange, unit, error, step = "0.1", min, max }) {
    return (
        <div>
            <div
                className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2 ${
                    error ? "border-red-400" : "border-input"
                }`}
            >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            inputMode="decimal"
                            step={step}
                            min={min}
                            max={max}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            aria-label={label}
                            aria-invalid={error ? "true" : undefined}
                            className="w-full bg-transparent text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="--"
                        />
                        {unit && <span className="text-[10px] text-muted-foreground shrink-0">{unit}</span>}
                    </div>
                </div>
            </div>
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    );
}

export function TriageForm({ patient, onSave, onCancel, saving }) {
    const [chiefComplaint, setChiefComplaint] = useState("");
    const [vitals, setVitals] = useState({
        systolic_bp: "", diastolic_bp: "", heart_rate: "", temperature: "",
        respiratory_rate: "", oxygen_saturation: "", weight: "", height: "",
    });
    const [allergies, setAllergies] = useState("");
    const [currentMeds, setCurrentMeds] = useState("");
    const [urgency, setUrgency] = useState("routine");
    const [triageNote, setTriageNote] = useState("");
    const [errors, setErrors] = useState({});

    const updateVital = useCallback((key) => (val) => {
        setVitals((prev) => ({ ...prev, [key]: val }));
        setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    }, []);

    const bmi = useMemo(
        () => computeBmi(parseFloat(vitals.weight), parseFloat(vitals.height)),
        [vitals.weight, vitals.height]
    );

    const handleSubmit = useCallback(
        (e) => {
            e.preventDefault();
            const result = validateTriage({ ...vitals, chief_complaint: chiefComplaint, urgency_level: urgency });
            if (!result.ok) {
                setErrors(result.errors);
                return;
            }
            setErrors({});
            onSave({
                patient_id: patient.id,
                appointment_id: patient.appointment_id || null,
                chief_complaint: chiefComplaint,
                vital_signs: triageVitalPayload(result.data),
                allergies,
                current_medications: currentMeds,
                urgency_level: urgency,
                triage_note: triageNote,
            });
        },
        [patient, chiefComplaint, vitals, allergies, currentMeds, urgency, triageNote, onSave]
    );

    const hasErrors = Object.values(errors).some(Boolean);

    return (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="rounded-xl border bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                    <Heart className="size-4 text-rose-500" />
                    <h3 className="text-sm font-semibold">Vital Signs</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {VITAL_FIELDS.map(({ key, icon }) => {
                        const range = VITAL_RANGES[key];
                        return (
                            <VitalInput
                                key={key}
                                icon={icon}
                                label={range.label}
                                unit={range.unit}
                                step={String(range.step)}
                                min={range.min}
                                max={range.max}
                                value={vitals[key]}
                                onChange={updateVital(key)}
                                error={errors[key]}
                            />
                        );
                    })}
                </div>
                {bmi !== null && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        BMI: <span className="font-semibold">{bmi}</span>
                        {bmi < 18.5 && " (Underweight)"}
                        {bmi >= 18.5 && bmi < 25 && " (Normal)"}
                        {bmi >= 25 && bmi < 30 && " (Overweight)"}
                        {bmi >= 30 && " (Obese)"}
                    </p>
                )}
            </div>

            <div className="rounded-xl border bg-white p-5">
                <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-500" />
                    <h3 className="text-sm font-semibold">Triage Assessment</h3>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Chief Complaint</label>
                        <textarea
                            value={chiefComplaint}
                            onChange={(e) => setChiefComplaint(e.target.value)}
                            maxLength={2000}
                            rows={2}
                            className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Patient's main reason for visit..."
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Urgency Level</label>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {URGENCY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setUrgency(opt.value)}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                        urgency === opt.value ? opt.color : "border-gray-200 text-gray-500 hover:bg-gray-50"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <Pill className="size-3" /> Allergies
                            </label>
                            <textarea
                                value={allergies}
                                onChange={(e) => setAllergies(e.target.value)}
                                maxLength={2000}
                                rows={2}
                                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Known allergies (drugs, food, etc.)"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <Pill className="size-3" /> Current Medications
                            </label>
                            <textarea
                                value={currentMeds}
                                onChange={(e) => setCurrentMeds(e.target.value)}
                                maxLength={2000}
                                rows={2}
                                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Current medications the patient is taking"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Triage Note</label>
                        <textarea
                            value={triageNote}
                            onChange={(e) => setTriageNote(e.target.value)}
                            maxLength={2000}
                            rows={2}
                            className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Additional observations..."
                        />
                    </div>
                </div>
            </div>

            {hasErrors && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
                    Please correct the highlighted vital sign values.
                </p>
            )}

            <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    Complete Triage
                </button>
            </div>
        </form>
    );
}

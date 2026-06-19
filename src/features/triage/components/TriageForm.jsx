"use client";
import { useCallback, useState } from "react";
import { Loader2, Heart, AlertTriangle, Pill, Stethoscope, Activity, Thermometer, Weight, Ruler, Baby } from "lucide-react";

const URGENCY_OPTIONS = [
    { value: "emergency", label: "Emergency", color: "text-red-600 bg-red-50 border-red-200" },
    { value: "urgent", label: "Urgent", color: "text-amber-600 bg-amber-50 border-amber-200" },
    { value: "routine", label: "Routine", color: "text-blue-600 bg-blue-50 border-blue-200" },
    { value: "non_urgent", label: "Non-Urgent", color: "text-gray-600 bg-gray-50 border-gray-200" },
];

function VitalInput({ icon: Icon, label, value, onChange, unit, type = "number", step = "0.1" }) {
    return (
        <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                <div className="flex items-center gap-1">
                    <input
                        type={type}
                        step={step}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-transparent text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="--"
                    />
                    {unit && <span className="text-[10px] text-muted-foreground shrink-0">{unit}</span>}
                </div>
            </div>
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

    const updateVital = useCallback((key) => (val) => {
        setVitals(prev => ({ ...prev, [key]: val }));
    }, []);

    const bmi = vitals.weight && vitals.height
        ? (parseFloat(vitals.weight) / ((parseFloat(vitals.height) / 100) ** 2)).toFixed(1)
        : null;

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        onSave({
            patient_id: patient.id,
            appointment_id: patient.appointment_id || null,
            chief_complaint: chiefComplaint,
            vital_signs: {
                systolic_bp: vitals.systolic_bp ? parseFloat(vitals.systolic_bp) : null,
                diastolic_bp: vitals.diastolic_bp ? parseFloat(vitals.diastolic_bp) : null,
                heart_rate: vitals.heart_rate ? parseFloat(vitals.heart_rate) : null,
                temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
                respiratory_rate: vitals.respiratory_rate ? parseFloat(vitals.respiratory_rate) : null,
                oxygen_saturation: vitals.oxygen_saturation ? parseFloat(vitals.oxygen_saturation) : null,
                weight: vitals.weight ? parseFloat(vitals.weight) : null,
                height: vitals.height ? parseFloat(vitals.height) : null,
                bmi: bmi ? parseFloat(bmi) : null,
            },
            allergies,
            current_medications: currentMeds,
            urgency_level: urgency,
            triage_note: triageNote,
        });
    }, [patient, chiefComplaint, vitals, bmi, allergies, currentMeds, urgency, triageNote, onSave]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl border bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                    <Heart className="size-4 text-rose-500" />
                    <h3 className="text-sm font-semibold">Vital Signs</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <VitalInput icon={Activity} label="Systolic BP" value={vitals.systolic_bp} onChange={updateVital("systolic_bp")} unit="mmHg" />
                    <VitalInput icon={Activity} label="Diastolic BP" value={vitals.diastolic_bp} onChange={updateVital("diastolic_bp")} unit="mmHg" />
                    <VitalInput icon={Heart} label="Heart Rate" value={vitals.heart_rate} onChange={updateVital("heart_rate")} unit="bpm" />
                    <VitalInput icon={Thermometer} label="Temperature" value={vitals.temperature} onChange={updateVital("temperature")} unit="°C" />
                    <VitalInput icon={Stethoscope} label="Respiratory Rate" value={vitals.respiratory_rate} onChange={updateVital("respiratory_rate")} unit="bpm" />
                    <VitalInput icon={Activity} label="O2 Saturation" value={vitals.oxygen_saturation} onChange={updateVital("oxygen_saturation")} unit="%" />
                    <VitalInput icon={Weight} label="Weight" value={vitals.weight} onChange={updateVital("weight")} unit="kg" />
                    <VitalInput icon={Ruler} label="Height" value={vitals.height} onChange={updateVital("height")} unit="cm" />
                </div>
                {bmi && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        BMI: <span className="font-semibold">{bmi}</span>
                        {parseFloat(bmi) < 18.5 && " (Underweight)"}
                        {parseFloat(bmi) >= 18.5 && parseFloat(bmi) < 25 && " (Normal)"}
                        {parseFloat(bmi) >= 25 && parseFloat(bmi) < 30 && " (Overweight)"}
                        {parseFloat(bmi) >= 30 && " (Obese)"}
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
                            rows={2}
                            className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Additional observations..."
                        />
                    </div>
                </div>
            </div>

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

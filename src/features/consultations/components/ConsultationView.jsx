"use client";
import { useRef } from "react";
import { Printer, Download, MessageSquare, FileText } from "lucide-react";

function formatFrequency(freq) {
    const map = {
        once_daily: "once daily",
        twice_daily: "twice daily",
        three_times_daily: "three times daily",
        four_times_daily: "four times daily",
        every_4_hours: "every 4 hours",
        every_6_hours: "every 6 hours",
        every_8_hours: "every 8 hours",
        every_12_hours: "every 12 hours",
        as_needed: "as needed",
        at_bedtime: "at bedtime",
        in_the_morning: "in the morning",
        stat: "immediately",
    };
    return map[freq] || freq;
}

function formatForm(form) {
    const map = {
        tablet: "tab", capsule: "cap", syrup: "syrup", suspension: "susp",
        injection: "inj", cream: "cream", ointment: "oint", drops: "drops",
        inhaler: "inhaler", suppository: "supp", sachet: "sachet",
    };
    return map[form] || form;
}

export function PrescriptionPreview({ consultation, clinic }) {
    const printRef = useRef();

    const handlePrint = () => {
        const win = window.open("", "_blank");
        if (!win) return;
        const content = printRef.current?.innerHTML || "";
        win.document.write(`
            <html>
            <head>
                <title>Prescription - ${consultation?.patients?.full_name || "Patient"}</title>
                <style>
                    @page { margin: 15mm; }
                    body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.5; color: #000; padding: 20px; }
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                    .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
                    .header p { margin: 2px 0; font-size: 11px; }
                    .patient-info { margin-bottom: 15px; }
                    .patient-info table { width: 100%; }
                    .patient-info td { font-size: 12px; padding: 1px 5px; }
                    .rx-title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; }
                    .medicine { margin-bottom: 10px; padding-left: 20px; }
                    .medicine p { margin: 1px 0; }
                    .medicine-name { font-weight: bold; font-size: 13px; }
                    .instructions { font-size: 11px; margin-top: 15px; border-top: 1px solid #ccc; padding-top: 10px; }
                    .footer { margin-top: 30px; text-align: right; }
                    .footer .doctor-name { font-weight: bold; }
                    .footer .doctor-qual { font-size: 10px; }
                    .footer-line { border-top: 1px solid #000; width: 200px; margin-left: auto; margin-top: 5px; }
                    .watermark { position: fixed; bottom: 20px; left: 0; right: 0; text-align: center; color: #ccc; font-size: 10px; }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 500);
    };

    const p = consultation?.patients;
    const doctor = consultation?.users;
    const diag = consultation?.diagnoses || [];
    const rx = consultation?.prescriptions || [];
    const inv = consultation?.investigations || [];
    const vitals = consultation?.vital_signs || {};
    const cDate = new Date(consultation?.created_at).toLocaleDateString("en-RW", {
        year: "numeric", month: "short", day: "numeric"
    });

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors">
                    <Printer className="size-3.5" /> Print
                </button>
                <button onClick={handlePrint} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors">
                    <Download className="size-3.5" /> PDF
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors">
                    <MessageSquare className="size-3.5" /> Share via WhatsApp
                </button>
            </div>

            <div ref={printRef} className="border bg-white p-6 text-black" style={{ fontFamily: "'Courier New', monospace", fontSize: "12px", lineHeight: "1.5" }}>
                <div className="text-center border-b-2 border-black pb-3 mb-4">
                    <h2 className="text-lg font-bold uppercase m-0">{clinic?.name || "Clinic"}</h2>
                    <p className="text-[11px] m-0.5">{clinic?.address || ""}</p>
                    <p className="text-[11px] m-0.5">📞 {clinic?.phone || ""} {clinic?.email ? `| ✉ ${clinic.email}` : ""}</p>
                </div>

                <div className="mb-4">
                    <table className="w-full text-xs">
                        <tbody>
                            <tr><td className="font-bold pr-2 w-20">Patient:</td><td>{p?.full_name || ""}</td></tr>
                            <tr><td className="font-bold pr-2">Date:</td><td>{cDate}</td></tr>
                            {p?.gender && <tr><td className="font-bold pr-2">Gender:</td><td>{p.gender}</td></tr>}
                            {p?.date_of_birth && (
                                <tr><td className="font-bold pr-2">Age:</td><td>{new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()} years</td></tr>
                            )}
                            {p?.phone && <tr><td className="font-bold pr-2">Phone:</td><td>{p.phone}</td></tr>}
                            {vitals?.weight && <tr><td className="font-bold pr-2">Weight:</td><td>{vitals.weight} kg</td></tr>}
                        </tbody>
                    </table>
                </div>

                {vitals && Object.keys(vitals).length > 0 && (
                    <div className="mb-4 text-xs">
                        <span className="font-bold">Vitals: </span>
                        {vitals.bp_systolic && vitals.bp_diastolic ? `BP ${vitals.bp_systolic}/${vitals.bp_diastolic} mmHg · ` : ""}
                        {vitals.pulse ? `Pulse ${vitals.pulse} bpm · ` : ""}
                        {vitals.temperature ? `Temp ${vitals.temperature}°C · ` : ""}
                        {vitals.spo2 ? `SpO₂ ${vitals.spo2}%` : ""}
                    </div>
                )}

                {diag.length > 0 && (
                    <div className="mb-4 text-xs">
                        <span className="font-bold">Diagnosis: </span>
                        {diag.filter(d => d.type === "primary").map(d => d.description).join(", ")}
                        {diag.filter(d => d.type === "secondary").length > 0 && (
                            <> · Secondary: {diag.filter(d => d.type === "secondary").map(d => d.description).join(", ")}</>
                        )}
                    </div>
                )}

                <div className="text-lg font-bold text-center my-4">Rx</div>

                {rx.length === 0 ? (
                    <p className="text-xs italic text-center">No medicines prescribed</p>
                ) : (
                    rx.map((m, i) => (
                        <div key={i} className="mb-2">
                            <p className="text-xs font-bold">{i + 1}. {m.medicine_name}{m.strength ? ` ${m.strength}` : ""}{m.form ? ` (${formatForm(m.form)})` : ""}</p>
                            <p className="text-xs pl-4">
                                {m.dosage ? `${m.dosage} ` : ""}
                                {m.frequency ? `${formatFrequency(m.frequency)}` : ""}
                                {m.duration ? ` for ${m.duration}` : ""}
                                {m.route && m.route !== "oral" ? ` · ${m.route}` : ""}
                            </p>
                            {m.notes && <p className="text-[10px] pl-4 italic">{m.notes}</p>}
                        </div>
                    ))
                )}

                {inv.length > 0 && (
                    <div className="mt-4 text-xs">
                        <p className="font-bold">Investigations Ordered:</p>
                        {inv.map((i, idx) => (
                            <p key={idx} className="pl-4">• {i.test_name}{i.instructions ? ` — ${i.instructions}` : ""}</p>
                        ))}
                    </div>
                )}

                {consultation?.follow_up_instructions && (
                    <div className="mt-4 text-xs">
                        <p className="font-bold">Instructions:</p>
                        <p className="pl-4">{consultation.follow_up_instructions}</p>
                    </div>
                )}

                {consultation?.follow_up_date && (
                    <p className="text-xs mt-2">
                        <span className="font-bold">Follow-up:</span> {new Date(consultation.follow_up_date).toLocaleDateString("en-RW", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                )}

                {consultation?.sick_leave_days > 0 && (
                    <p className="text-xs mt-2">
                        <span className="font-bold">Sick Leave:</span> {consultation.sick_leave_days} day(s)
                    </p>
                )}

                <div className="mt-8 text-right">
                    <p className="font-bold text-sm">{doctor?.full_name || ""}</p>
                    <p className="text-[10px]">Doctor</p>
                    <div className="border-t border-black w-48 ml-auto mt-1"></div>
                </div>

                <div className="mt-4 text-[9px] text-center text-gray-400">
                    This is a computer-generated prescription. Signature not required.
                </div>
            </div>
        </div>
    );
}

export function ConsultationView({ consultation, clinic, onBack }) {
    if (!consultation) return null;

    const p = consultation.patients;
    const doctor = consultation.users;
    const diag = consultation.diagnoses || [];
    const rx = consultation.prescriptions || [];
    const inv = consultation.investigations || [];
    const vitals = consultation.vital_signs || {};
    const cDate = new Date(consultation.created_at);

    const primaryDx = diag.filter(d => d.type === "primary");
    const secondaryDx = diag.filter(d => d.type === "secondary" || d.type === "differential");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Consultation Detail</h2>
                    <p className="text-xs text-muted-foreground">
                        {cDate.toLocaleDateString("en-RW", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    consultation.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                    consultation.status === "in_progress" ? "bg-amber-50 text-amber-700" :
                    "bg-red-50 text-red-700"
                }`}>
                    {consultation.status === "completed" ? "Completed" : consultation.status === "in_progress" ? "In Progress" : "Cancelled"}
                </span>
            </div>

            <PrescriptionPreview consultation={consultation} clinic={clinic} />

            <div className="rounded-lg border p-4 bg-muted/10">
                <h3 className="text-sm font-semibold mb-3">Full Clinical Notes</h3>
                <div className="space-y-3 text-sm">
                    {vitals && Object.keys(vitals).length > 0 && (
                        <div>
                            <span className="font-medium text-muted-foreground">Vital Signs:</span>
                            <div className="grid grid-cols-4 gap-2 mt-1">
                                {vitals.bp_systolic && vitals.bp_diastolic && (
                                    <div className="rounded bg-white border p-2 text-center">
                                        <span className="text-[10px] text-muted-foreground block">BP</span>
                                        <span className="font-semibold">{vitals.bp_systolic}/{vitals.bp_diastolic}</span>
                                    </div>
                                )}
                                {vitals.pulse && (
                                    <div className="rounded bg-white border p-2 text-center">
                                        <span className="text-[10px] text-muted-foreground block">Pulse</span>
                                        <span className="font-semibold">{vitals.pulse} <span className="text-[10px] font-normal">bpm</span></span>
                                    </div>
                                )}
                                {vitals.temperature && (
                                    <div className="rounded bg-white border p-2 text-center">
                                        <span className="text-[10px] text-muted-foreground block">Temp</span>
                                        <span className="font-semibold">{vitals.temperature}°C</span>
                                    </div>
                                )}
                                {vitals.spo2 && (
                                    <div className="rounded bg-white border p-2 text-center">
                                        <span className="text-[10px] text-muted-foreground block">SpO₂</span>
                                        <span className="font-semibold">{vitals.spo2}%</span>
                                    </div>
                                )}
                                {vitals.weight && (
                                    <div className="rounded bg-white border p-2 text-center">
                                        <span className="text-[10px] text-muted-foreground block">Weight</span>
                                        <span className="font-semibold">{vitals.weight} kg</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {consultation.chief_complaint && (
                        <div>
                            <span className="font-medium text-muted-foreground">Chief Complaint:</span>
                            <p>{consultation.chief_complaint}</p>
                        </div>
                    )}
                    {consultation.history_of_presenting_illness && (
                        <div>
                            <span className="font-medium text-muted-foreground">HPI:</span>
                            <p className="whitespace-pre-wrap">{consultation.history_of_presenting_illness}</p>
                        </div>
                    )}
                    {consultation.physical_examination && (
                        <div>
                            <span className="font-medium text-muted-foreground">Physical Exam:</span>
                            <p className="whitespace-pre-wrap">{consultation.physical_examination}</p>
                        </div>
                    )}

                    {primaryDx.length > 0 && (
                        <div>
                            <span className="font-medium text-muted-foreground">Primary Diagnosis:</span>
                            <ul className="list-disc pl-5 mt-1">
                                {primaryDx.map(d => (
                                    <li key={d.id}>{d.description}{d.icd_code ? ` (${d.icd_code})` : ""}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {secondaryDx.length > 0 && (
                        <div>
                            <span className="font-medium text-muted-foreground">Secondary / Differential:</span>
                            <ul className="list-disc pl-5 mt-1">
                                {secondaryDx.map(d => (
                                    <li key={d.id}>{d.description} <span className="text-[10px] text-muted-foreground">({d.type})</span></li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {rx.length > 0 && (
                        <div>
                            <span className="font-medium text-muted-foreground">Prescriptions:</span>
                            <table className="w-full mt-1 text-xs border-collapse">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="px-2 py-1 text-left">Medicine</th>
                                        <th className="px-2 py-1 text-left">Dose</th>
                                        <th className="px-2 py-1 text-left">Frequency</th>
                                        <th className="px-2 py-1 text-left">Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rx.map(m => (
                                        <tr key={m.id} className="border-b">
                                            <td className="px-2 py-1 font-medium">{m.medicine_name} {m.strength}</td>
                                            <td className="px-2 py-1">{m.dosage}</td>
                                            <td className="px-2 py-1">{formatFrequency(m.frequency)}</td>
                                            <td className="px-2 py-1">{m.duration}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {inv.length > 0 && (
                        <div>
                            <span className="font-medium text-muted-foreground">Investigations:</span>
                            <ul className="list-disc pl-5 mt-1">
                                {inv.map(i => (
                                    <li key={i.id}>
                                        {i.test_name}
                                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                                            i.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                                            i.status === "ordered" ? "bg-amber-50 text-amber-700" :
                                            "bg-muted text-muted-foreground"
                                        }`}>{i.status}</span>
                                        {i.result_value && ` → ${i.result_value} ${i.result_unit || ""}`}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {consultation.assessment && (
                        <div>
                            <span className="font-medium text-muted-foreground">Assessment:</span>
                            <p className="whitespace-pre-wrap">{consultation.assessment}</p>
                        </div>
                    )}
                    {consultation.treatment_plan && (
                        <div>
                            <span className="font-medium text-muted-foreground">Treatment Plan:</span>
                            <p className="whitespace-pre-wrap">{consultation.treatment_plan}</p>
                        </div>
                    )}
                    {consultation.follow_up_instructions && (
                        <div>
                            <span className="font-medium text-muted-foreground">Follow-up Instructions:</span>
                            <p>{consultation.follow_up_instructions}</p>
                        </div>
                    )}
                    {consultation.follow_up_date && (
                        <div>
                            <span className="font-medium text-muted-foreground">Follow-up Date:</span>
                            <p>{new Date(consultation.follow_up_date).toLocaleDateString("en-RW", { year: "numeric", month: "long", day: "numeric" })}</p>
                        </div>
                    )}
                    {consultation.sick_leave_days > 0 && (
                        <div>
                            <span className="font-medium text-muted-foreground">Sick Leave:</span>
                            <p>{consultation.sick_leave_days} day(s)</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

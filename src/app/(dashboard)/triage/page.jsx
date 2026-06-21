"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Search, AlertTriangle, Heart, Clock, User, Stethoscope, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getTriageService } from "@/features/triage/services/triage.service";
import { toast } from "sonner";

const URGENCY_STYLES = {
    emergency: "text-red-600 bg-red-50 border-red-200",
    urgent: "text-amber-600 bg-amber-50 border-amber-200",
    routine: "text-blue-600 bg-blue-50 border-blue-200",
    non_urgent: "text-gray-600 bg-gray-50 border-gray-200",
};

const STATUS_STYLES = {
    waiting: "text-amber-600 bg-amber-50",
    in_consultation: "text-purple-600 bg-purple-50",
    completed: "text-emerald-600 bg-emerald-50",
};

export default function TriageQueuePage() {
    const { clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getTriageService(), []);
    const [records, setRecords] = useState([]);
    const [completedRecords, setCompletedRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("active");

    const load = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const [active, completed] = await Promise.all([
                service.getTriageQueue(clinicId),
                service.getCompletedTriage(clinicId),
            ]);
            setRecords(active);
            setCompletedRecords(completed);
        } catch {
            toast.error("Failed to load triage queue");
        } finally {
            setLoading(false);
        }
    }, [clinicId, service]);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const items = tab === "active" ? records : completedRecords;
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(r => (r.patients?.full_name || "").toLowerCase().includes(q));
    }, [records, completedRecords, search, tab]);

    const handleMoveToConsultation = useCallback(async (recordId) => {
        try {
            await service.updateTriageStatus(clinicId, recordId, "in_consultation");
            toast.success("Moved to consultation");
            load();
        } catch {
            toast.error("Failed to update status");
        }
    }, [clinicId, service, load]);

    const activeCount = records.filter(r => r.status !== "completed").length;

    return (
        <div className="space-y-5">
            <PageHeader title="Triage Queue" description={`${activeCount} patients waiting`}>
                <Link to="/triage/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Plus className="size-3.5" /> New Triage
                </Link>
            </PageHeader>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search patient..."
                        className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <div className="flex items-center gap-1 rounded-lg border p-0.5">
                    <button onClick={() => setTab("active")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === "active" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        Active ({activeCount})
                    </button>
                    <button onClick={() => setTab("completed")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === "completed" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        Completed
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground"/></div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <Heart className="size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No patients in triage queue</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((record) => (
                        <div key={record.id} className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm hover:shadow transition-shadow">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <User className="size-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-[#0a2540]">{record.patients?.full_name}</p>
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${URGENCY_STYLES[record.urgency_level] || URGENCY_STYLES.routine}`}>
                                        {record.urgency_level}
                                    </span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[record.status]}`}>
                                        {record.status.replace("_", " ")}
                                    </span>
                                </div>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">{record.chief_complaint || "No complaint recorded"}</p>
                                {record.vital_signs?.systolic_bp && (
                                    <p className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span>BP: {record.vital_signs.systolic_bp}/{record.vital_signs.diastolic_bp || "?"}</span>
                                        <span>HR: {record.vital_signs.heart_rate || "—"}</span>
                                        <span>T: {record.vital_signs.temperature || "—"}°C</span>
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Link
                                    to={`/consultations/new?patientId=${record.patient_id}`}
                                    onClick={() => { if (record.status === "waiting") handleMoveToConsultation(record.id); }}
                                    className="inline-flex items-center gap-1 rounded-lg bg-primary/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary transition-colors"
                                >
                                    <Stethoscope className="size-3" /> Start Consultation
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Loader2, Plus, BedDouble, Search, User, Clock, CheckCircle2,
    ArrowRightLeft, LogOut, X,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getAdmissionService } from "@/features/admissions/services/admission.service";
import { toast } from "sonner";

const STATUS_STYLES = {
    active: { bg: "bg-emerald-50", text: "text-emerald-700", icon: Clock },
    discharged: { bg: "bg-blue-50", text: "text-blue-700", icon: CheckCircle2 },
    transferred: { bg: "bg-amber-50", text: "text-amber-700", icon: ArrowRightLeft },
    left_ama: { bg: "bg-red-50", text: "text-red-700", icon: LogOut },
};

const TABS = [
    { id: "active", label: "Active" },
    { id: "discharged", label: "Discharged" },
    { id: "all", label: "All" },
];

export default function AdmissionsPage() {
    const { clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getAdmissionService(), []);

    const [admissions, setAdmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("active");
    const [search, setSearch] = useState("");

    const loadAdmissions = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const status = activeTab === "all" ? null : activeTab;
            const data = await service.getAdmissions(clinicId, status);
            setAdmissions(data);
        } catch {
            toast.error("Failed to load admissions");
        } finally {
            setLoading(false);
        }
    }, [clinicId, service, activeTab]);

    useEffect(() => { loadAdmissions(); }, [loadAdmissions]);

    const filtered = useMemo(() => {
        if (!search.trim()) return admissions;
        const q = search.toLowerCase();
        return admissions.filter(a =>
            (a.patients?.full_name || "").toLowerCase().includes(q) ||
            (a.ward || "").toLowerCase().includes(q) ||
            (a.bed_number || "").toLowerCase().includes(q) ||
            (a.diagnosis || "").toLowerCase().includes(q)
        );
    }, [admissions, search]);

    const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
    const formatTime = (d) => d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";

    const calcDays = (admission, discharge) => {
        const start = new Date(admission);
        const end = discharge ? new Date(discharge) : new Date();
        return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    };

    return (
        <div className="space-y-5">
            <PageHeader title="Admissions (IPD)" description={`${admissions.length} total admission${admissions.length !== 1 ? "s" : ""}`}>
                <Link to="/admissions/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <Plus className="size-4" /> New Admission
                </Link>
            </PageHeader>

            {/* Tabs */}
            <div className="flex items-center gap-1 rounded-xl border bg-white p-1 max-w-sm">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-center ${
                            activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                        }`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, ward, diagnosis..."
                    className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="size-3.5" />
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
                    <BedDouble className="size-12 text-muted-foreground/40" />
                    <h3 className="text-lg font-medium">No admissions</h3>
                    <p className="max-w-sm text-center text-sm text-muted-foreground">
                        {search ? "No admissions match your search." : activeTab === "active" ? "No active admissions right now." : "No admissions in this category."}
                    </p>
                    {!search && (
                        <Link to="/admissions/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                            <Plus className="size-4" /> Admit Patient
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(a => {
                        const style = STATUS_STYLES[a.status] || STATUS_STYLES.active;
                        const StatusIcon = style.icon;
                        return (
                            <Link key={a.id} to={`/admissions/${a.id}`}
                                className="block rounded-xl border bg-white p-4 hover:shadow-sm transition-shadow">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                            <User className="size-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate">{a.patients?.full_name || "Unknown Patient"}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {a.ward}{a.bed_number ? ` · Bed ${a.bed_number}` : ""} · {a.doctor_name}
                                            </p>
                                            {a.diagnosis && (
                                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Dx: {a.diagnosis}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
                                            <StatusIcon className="size-3" /> {a.status.replace("_", " ")}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatDate(a.admission_date)}
                                        </span>
                                        {a.status === "active" && (
                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                {calcDays(a.admission_date)} day{calcDays(a.admission_date) !== 1 ? "s" : ""}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

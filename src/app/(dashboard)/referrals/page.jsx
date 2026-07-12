"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Loader2, Plus, Search, ArrowRightLeft, Clock, CheckCircle2,
    XCircle, AlertTriangle, User, X,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getReferralService } from "@/features/referrals/services/referral.service";
import { toast } from "sonner";

const STATUS_STYLES = {
    pending: { bg: "bg-amber-50", text: "text-amber-700", icon: Clock },
    accepted: { bg: "bg-blue-50", text: "text-blue-700", icon: CheckCircle2 },
    completed: { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2 },
    rejected: { bg: "bg-red-50", text: "text-red-700", icon: XCircle },
};

const URGENCY_STYLES = {
    urgent: { bg: "bg-red-50", text: "text-red-700" },
    normal: { bg: "bg-gray-50", text: "text-gray-600" },
    follow_up: { bg: "bg-blue-50", text: "text-blue-700" },
};

const TABS = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "accepted", label: "Accepted" },
    { id: "completed", label: "Completed" },
];

export default function ReferralsPage() {
    const { clinic: authClinic, user } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getReferralService(), []);

    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [search, setSearch] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    const loadReferrals = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const status = activeTab === "all" ? undefined : activeTab;
            const data = await service.getReferrals(clinicId, { status });
            setReferrals(data);
        } catch {
            toast.error("Failed to load referrals");
        } finally {
            setLoading(false);
        }
    }, [clinicId, service, activeTab]);

    useEffect(() => { loadReferrals(); }, [loadReferrals]);

    const filtered = useMemo(() => {
        if (!search.trim()) return referrals;
        const q = search.toLowerCase();
        return referrals.filter(r =>
            (r.patients?.full_name || "").toLowerCase().includes(q) ||
            (r.to_provider || "").toLowerCase().includes(q) ||
            (r.to_facility || "").toLowerCase().includes(q) ||
            (r.reason || "").toLowerCase().includes(q)
        );
    }, [referrals, search]);

    const handleStatusUpdate = async (id, status, outcome = null) => {
        if (!clinicId || !user) return;
        setUpdatingId(id);
        try {
            await service.updateReferralStatus(clinicId, id, status, outcome, user.id);
            toast.success(`Referral ${status}`);
            await loadReferrals();
        } catch (err) {
            toast.error("Failed to update referral");
        } finally {
            setUpdatingId(null);
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    return (
        <div className="space-y-5">
            <PageHeader title="Referrals" description={`${referrals.length} total referral${referrals.length !== 1 ? "s" : ""}`}>
                <Link to="/referrals/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <Plus className="size-4" /> New Referral
                </Link>
            </PageHeader>

            {/* Tabs */}
            <div className="flex items-center gap-1 rounded-xl border bg-white p-1 max-w-md">
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
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, provider, facility..."
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
                    <ArrowRightLeft className="size-12 text-muted-foreground/40" />
                    <h3 className="text-lg font-medium">No referrals</h3>
                    <p className="max-w-sm text-center text-sm text-muted-foreground">
                        {search ? "No referrals match your search." : "No referrals in this category."}
                    </p>
                    {!search && (
                        <Link to="/referrals/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                            <Plus className="size-4" /> Create Referral
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(r => {
                        const style = STATUS_STYLES[r.status] || STATUS_STYLES.pending;
                        const urgencyStyle = URGENCY_STYLES[r.urgency] || URGENCY_STYLES.normal;
                        const StatusIcon = style.icon;
                        return (
                            <div key={r.id} className="rounded-xl border bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                            <User className="size-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate">{r.patients?.full_name || "Unknown Patient"}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                To: <strong>{r.to_provider}</strong>
                                                {r.to_facility && ` · ${r.to_facility}`}
                                                {r.referral_type === "internal" ? " · Internal" : " · External"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Reason: {r.reason}</p>
                                            <p className="text-[10px] text-muted-foreground">{formatDate(r.created_at)} · {r.doctor_name}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgencyStyle.bg} ${urgencyStyle.text}`}>
                                                {r.urgency === "follow_up" ? "Follow-up" : r.urgency}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
                                                <StatusIcon className="size-3" /> {r.status}
                                            </span>
                                        </div>
                                        {r.status === "pending" && (
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleStatusUpdate(r.id, "accepted")} disabled={updatingId === r.id}
                                                    className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                                                    Accept
                                                </button>
                                                <button onClick={() => handleStatusUpdate(r.id, "rejected")} disabled={updatingId === r.id}
                                                    className="rounded-lg border px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                        {r.status === "accepted" && (
                                            <button onClick={() => handleStatusUpdate(r.id, "completed")} disabled={updatingId === r.id}
                                                className="rounded-lg bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                                                Complete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

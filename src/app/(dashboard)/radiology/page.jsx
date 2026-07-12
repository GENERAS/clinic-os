"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, Filter, Plus, Eye, Clock, CheckCircle2, AlertCircle, XCircle, Camera } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getRadiologyService } from "@/features/radiology/services/radiology.service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const STATUS_OPTIONS = [
    { value: "", label: "All" },
    { value: "ordered", label: "Ordered" },
    { value: "scheduled", label: "Scheduled" },
    { value: "imaging_done", label: "Imaging Done" },
    { value: "report_written", label: "Report Written" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES = {
    ordered: "text-amber-600 bg-amber-50",
    scheduled: "text-blue-600 bg-blue-50",
    imaging_done: "text-purple-600 bg-purple-50",
    report_written: "text-indigo-600 bg-indigo-50",
    completed: "text-emerald-600 bg-emerald-50",
    cancelled: "text-gray-600 bg-gray-50",
};

const MODALITY_LABELS = {
    xray: "X-Ray",
    ultrasound: "Ultrasound",
    ct: "CT Scan",
    mri: "MRI",
    ecg: "ECG",
    echo: "Echocardiogram",
    fluoroscopy: "Fluoroscopy",
    mammography: "Mammography",
    dexa: "DEXA",
    other: "Other",
};

const MODALITY_STYLES = {
    xray: "bg-sky-50 text-sky-700",
    ultrasound: "bg-teal-50 text-teal-700",
    ct: "bg-violet-50 text-violet-700",
    mri: "bg-fuchsia-50 text-fuchsia-700",
    ecg: "bg-rose-50 text-rose-700",
    echo: "bg-cyan-50 text-cyan-700",
    fluoroscopy: "bg-orange-50 text-orange-700",
    mammography: "bg-pink-50 text-pink-700",
    dexa: "bg-lime-50 text-lime-700",
    other: "bg-gray-50 text-gray-700",
};

export default function RadiologyPage() {
    const { clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getRadiologyService(), []);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [modalityFilter, setModalityFilter] = useState("");

    const load = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const data = await service.getOrders(clinicId);
            setOrders(data);
        } catch (err) {
            toast.error(handleApiError(err, "Failed to load radiology orders"));
        } finally {
            setLoading(false);
        }
    }, [clinicId, service]);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        let items = orders;
        if (statusFilter) items = items.filter(o => o.status === statusFilter);
        if (modalityFilter) items = items.filter(o => o.modality === modalityFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(o =>
                (o.body_part || "").toLowerCase().includes(q) ||
                (o.clinical_indication || "").toLowerCase().includes(q) ||
                (o.patients?.full_name || "").toLowerCase().includes(q)
            );
        }
        return items;
    }, [orders, statusFilter, modalityFilter, search]);

    const stats = useMemo(() => ({
        ordered: orders.filter(o => o.status === "ordered").length,
        scheduled: orders.filter(o => o.status === "scheduled").length,
        imaging_done: orders.filter(o => o.status === "imaging_done").length,
        pending_reports: orders.filter(o => o.status === "imaging_done" || o.status === "report_written").length,
        completed: orders.filter(o => o.status === "completed").length,
    }), [orders]);

    return (
        <div className="space-y-5">
            <PageHeader title="Radiology" description={`${stats.ordered} ordered · ${stats.pending_reports} pending reports`}>
                <Link to="/radiology/new" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors">
                    <Plus className="size-3.5" /> New Order
                </Link>
            </PageHeader>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Ordered", value: stats.ordered, color: "text-amber-600 bg-amber-50" },
                    { label: "Scheduled", value: stats.scheduled, color: "text-blue-600 bg-blue-50" },
                    { label: "Pending Reports", value: stats.pending_reports, color: "text-purple-600 bg-purple-50" },
                    { label: "Completed", value: stats.completed, color: "text-emerald-600 bg-emerald-50" },
                ].map(s => (
                    <div key={s.label} className={`rounded-xl border p-3 ${s.color.split(" ")[1]}`}>
                        <p className="text-[10px] font-medium uppercase">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color.split(" ")[0]}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient, body part, indication..." className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="flex items-center gap-1.5">
                    <Filter className="size-4 text-muted-foreground" />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm outline-none">
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <select value={modalityFilter} onChange={(e) => setModalityFilter(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm outline-none">
                    <option value="">All Modalities</option>
                    {Object.entries(MODALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <Camera className="size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No radiology orders found</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((order) => (
                        <Link key={order.id} to={`/radiology/${order.id}`} className="block rounded-xl border bg-white shadow-sm hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 p-4">
                                <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                                    order.status === "completed" ? "bg-emerald-50 text-emerald-600" :
                                    order.urgency === "urgent" || order.urgency === "stat" ? "bg-red-50 text-red-600" :
                                    "bg-sky-50 text-sky-600"
                                }`}>
                                    {order.status === "completed" ? <CheckCircle2 className="size-4" /> :
                                     order.urgency === "urgent" || order.urgency === "stat" ? <AlertCircle className="size-4" /> :
                                     <Camera className="size-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold">{order.body_part}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${MODALITY_STYLES[order.modality] || ""}`}>
                                            {MODALITY_LABELS[order.modality] || order.modality}
                                        </span>
                                        {(order.urgency === "urgent" || order.urgency === "stat") && (
                                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-red-600 bg-red-50 uppercase">
                                                {order.urgency}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{order.clinical_indication}</p>
                                    <p className="text-xs text-muted-foreground">{order.patients?.full_name || "Unknown patient"} · {new Date(order.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[order.status] || ""}`}>
                                        {order.status.replace(/_/g, " ")}
                                    </span>
                                    {order.radiology_images?.length > 0 && (
                                        <span className="text-[10px] text-muted-foreground">{order.radiology_images.length} img</span>
                                    )}
                                    {order.radiology_reports?.length > 0 && (
                                        <span className="text-[10px] text-emerald-600">✓ report</span>
                                    )}
                                    <Eye className="size-4 text-muted-foreground" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

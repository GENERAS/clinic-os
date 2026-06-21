"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, Filter, Beaker, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getInvestigationService } from "@/features/investigations/services/investigation.service";
import { toast } from "sonner";

const STATUS_OPTIONS = [
    { value: "", label: "All" },
    { value: "ordered", label: "Ordered" },
    { value: "sample_collected", label: "Sample Collected" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES = {
    ordered: "text-amber-600 bg-amber-50",
    sample_collected: "text-blue-600 bg-blue-50",
    in_progress: "text-purple-600 bg-purple-50",
    completed: "text-emerald-600 bg-emerald-50",
    cancelled: "text-gray-600 bg-gray-50",
};

function ResultEntryForm({ investigation, onSave, onCancel }) {
    const [resultValue, setResultValue] = useState(investigation.result_value || "");
    const [resultUnit, setResultUnit] = useState(investigation.result_unit || "");
    const [referenceRange, setReferenceRange] = useState(investigation.reference_range || "");
    const [isAbnormal, setIsAbnormal] = useState(investigation.is_abnormal || false);
    const [resultNotes, setResultNotes] = useState(investigation.result_notes || "");
    const [status, setStatus] = useState("completed");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(investigation.id, {
                result_value: resultValue,
                result_unit: resultUnit,
                reference_range: referenceRange,
                is_abnormal: isAbnormal,
                result_notes: resultNotes,
                status,
            });
            toast.success("Result saved");
            onCancel();
        } catch {
            toast.error("Failed to save result");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-4 space-y-3">
            <h4 className="text-sm font-semibold">{investigation.test_name}</h4>
            {investigation.category && <p className="text-[10px] text-muted-foreground uppercase">{investigation.category}</p>}

            <div className="grid gap-3 sm:grid-cols-3">
                <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Result Value</label>
                    <input value={resultValue} onChange={(e) => setResultValue(e.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. 5.2" />
                </div>
                <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Unit</label>
                    <input value={resultUnit} onChange={(e) => setResultUnit(e.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. mmol/L" />
                </div>
                <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Reference Range</label>
                    <input value={referenceRange} onChange={(e) => setReferenceRange(e.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. 3.5-5.5" />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-medium">
                    <input type="checkbox" checked={isAbnormal} onChange={(e) => setIsAbnormal(e.target.checked)} className="rounded" />
                    Abnormal result
                </label>
                <div className="flex items-center gap-2">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border bg-white px-2 py-1.5 text-xs outline-none">
                        <option value="completed">Completed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="sample_collected">Sample Collected</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Notes</label>
                <textarea value={resultNotes} onChange={(e) => setResultNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="Additional notes..." />
            </div>

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {saving && <Loader2 className="size-3 animate-spin" />}
                    Save Result
                </button>
            </div>
        </form>
    );
}

export default function InvestigationsPage() {
    const { clinic: authClinic, user } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getInvestigationService(), []);
    const [investigations, setInvestigations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [expandedId, setExpandedId] = useState(null);

    const load = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const data = await service.getInvestigations(clinicId, { pendingOnly: false });
            setInvestigations(data);
        } catch {
            toast.error("Failed to load investigations");
        } finally {
            setLoading(false);
        }
    }, [clinicId, service]);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        let items = investigations;
        if (statusFilter) items = items.filter(i => i.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(i =>
                (i.test_name || "").toLowerCase().includes(q) ||
                (i.consultations?.patients?.full_name || "").toLowerCase().includes(q)
            );
        }
        return items;
    }, [investigations, statusFilter, search]);

    const handleSaveResult = useCallback(async (investigationId, resultData) => {
        if (!clinicId || !user) return;
        await service.updateResult(clinicId, investigationId, resultData, user.id);
        load();
    }, [clinicId, user, service, load]);

    const pendingCount = investigations.filter(i => i.status === "ordered" || i.status === "sample_collected").length;

    return (
        <div className="space-y-5">
            <PageHeader title="Lab Results Portal" description={`${pendingCount} pending results`} />

            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search test or patient..." className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="flex items-center gap-1.5">
                    <Filter className="size-4 text-muted-foreground" />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm outline-none">
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground"/></div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <Beaker className="size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No investigations found</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((inv) => (
                        <div key={inv.id} className="rounded-xl border bg-white shadow-sm">
                            <button onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors">
                                <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                                    inv.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                }`}>
                                    {inv.status === "completed" ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold">{inv.test_name}</p>
                                        {inv.is_abnormal && <AlertCircle className="size-3.5 text-red-500" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{inv.consultations?.patients?.full_name || "Unknown patient"}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[inv.status] || "text-gray-600 bg-gray-50"}`}>
                                        {inv.status.replace(/_/g, " ")}
                                    </span>
                                    {inv.result_value && <span className="text-xs font-semibold">{inv.result_value} {inv.result_unit || ""}</span>}
                                </div>
                            </button>

                            {expandedId === inv.id && (
                                <div className="border-t px-4 py-3 space-y-3">
                                    {inv.instructions && <p className="text-xs text-muted-foreground"><span className="font-medium">Instructions:</span> {inv.instructions}</p>}
                                    {inv.result_value ? (
                                        <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
                                            <p><span className="font-medium">Result:</span> {inv.result_value} {inv.result_unit || ""}</p>
                                            {inv.reference_range && <p><span className="font-medium">Reference Range:</span> {inv.reference_range}</p>}
                                            {inv.is_abnormal && <p className="text-red-600 font-medium">⚠ Abnormal</p>}
                                            {inv.result_notes && <p className="text-muted-foreground">{inv.result_notes}</p>}
                                        </div>
                                    ) : (
                                        <ResultEntryForm
                                            investigation={inv}
                                            onSave={handleSaveResult}
                                            onCancel={() => setExpandedId(null)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

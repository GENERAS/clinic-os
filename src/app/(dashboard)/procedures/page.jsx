"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Search, X, Scissors, User, Calendar } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getProcedureService } from "@/features/procedures/services/procedure.service";
import { toast } from "sonner";

export default function ProceduresPage() {
    const { clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getProcedureService(), []);

    const [procedures, setProcedures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const loadProcedures = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const filters = {};
            if (dateFrom) filters.dateFrom = dateFrom;
            if (dateTo) filters.dateTo = dateTo + "T23:59:59";
            const data = await service.getProcedures(clinicId, filters);
            setProcedures(data);
        } catch {
            toast.error("Failed to load procedures");
        } finally {
            setLoading(false);
        }
    }, [clinicId, service, dateFrom, dateTo]);

    useEffect(() => { loadProcedures(); }, [loadProcedures]);

    const filtered = useMemo(() => {
        if (!search.trim()) return procedures;
        const q = search.toLowerCase();
        return procedures.filter(p =>
            (p.procedure_name || "").toLowerCase().includes(q) ||
            (p.patients?.full_name || "").toLowerCase().includes(q) ||
            (p.users?.full_name || "").toLowerCase().includes(q)
        );
    }, [procedures, search]);

    const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    return (
        <div className="space-y-5">
            <PageHeader title="Procedures" description={`${procedures.length} recorded procedure${procedures.length !== 1 ? "s" : ""}`}>
                <Link to="/procedures/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <Plus className="size-4" /> Record Procedure
                </Link>
            </PageHeader>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search procedure, patient, doctor..."
                        className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
                    <Scissors className="size-12 text-muted-foreground/40" />
                    <h3 className="text-lg font-medium">No procedures</h3>
                    <p className="max-w-sm text-center text-sm text-muted-foreground">
                        {search || dateFrom || dateTo ? "No procedures match your filters." : "No procedures have been recorded yet."}
                    </p>
                    {!search && !dateFrom && !dateTo && (
                        <Link to="/procedures/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                            <Plus className="size-4" /> Record Procedure
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(p => (
                        <div key={p.id} className="rounded-xl border bg-white p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                    <Scissors className="size-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-slate-900">{p.procedure_name}</p>
                                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                            completed
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                                        <User className="size-3" /> {p.patients?.full_name || "Unknown Patient"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Doctor: {p.users?.full_name || "—"}</p>
                                    {p.treatment_plan && (
                                        <p className="mt-1 text-xs text-muted-foreground truncate">Notes: {p.treatment_plan}</p>
                                    )}
                                    <p className="mt-0.5 text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Calendar className="size-3" /> {formatDate(p.created_at)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

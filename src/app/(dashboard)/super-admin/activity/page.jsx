"use client";
import { PageHeader } from "@/components/shared/page-header";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ClipboardList, Loader2, Search, Filter, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";

function cn(...classes) { return classes.filter(Boolean).join(" "); }

const ACTION_COLORS = {
  login: "bg-blue-100 text-blue-700",
  logout: "bg-gray-100 text-gray-500",
  created: "bg-green-100 text-green-700",
  updated: "bg-amber-100 text-amber-700",
  deleted: "bg-red-100 text-red-700",
};

export default function SuperAdminActivity() {
  const [logs, setLogs] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterClinic, setFilterClinic] = useState("");
  const [showLoginActivity, setShowLoginActivity] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    async function fetch() {
      try {
        const [logsRes, clinicsRes] = await Promise.all([
          supabase.from("audit_logs")
            .select("id, action, entity_type, entity_id, clinic_id, user_id, created_at, old_value, new_value")
            .order("created_at", { ascending: false })
            .limit(200),
          supabase.from("clinics").select("id, name"),
        ]);
        setLogs(logsRes.data ?? []);
        setClinics(clinicsRes.data ?? []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const clinicMap = Object.fromEntries(clinics.map((c) => [c.id, c.name]));

  const filtered = logs.filter((log) => {
    if (!showLoginActivity && (log.action === "login" || log.action === "logout")) return false;
    if (search && !JSON.stringify(log).toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAction && log.action !== filterAction) return false;
    if (filterClinic && log.clinic_id !== filterClinic) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description={`Every action is recorded. ${filtered.length} entries shown.`} />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search logs..."
            className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>
        <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
          className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary">
          <option value="">All actions</option>
          {["login", "logout", "created", "updated", "deleted"].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select value={filterClinic} onChange={(e) => { setFilterClinic(e.target.value); setPage(0); }}
          className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary">
          <option value="">All clinics</option>
          {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          type="button"
          onClick={() => { setShowLoginActivity(!showLoginActivity); setPage(0); }}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            showLoginActivity
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {showLoginActivity ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {showLoginActivity ? "Hide login activity" : "Show login activity"}
        </button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        {paged.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No logs found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border text-left text-xs font-semibold text-foreground">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Clinic</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paged.map((log) => (
                <tr key={log.id} className="hover:bg-accent">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium",
                      ACTION_COLORS[log.action] || "bg-muted text-muted-foreground")}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="text-muted-foreground">{log.entity_type}</span>
                    {log.entity_id && (
                      <span className="ml-1 text-[10px] text-muted-foreground/50">({log.entity_id.slice(0, 8)})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {clinicMap[log.clinic_id] || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.action === "login" || log.action === "logout"
                      ? "User session"
                      : [log.old_value, log.new_value].filter(Boolean).map(v =>
                          typeof v === "object" ? Object.keys(v).join(", ") : String(v)
                        ).join(" → ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="size-3.5" /> Previous
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Next <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

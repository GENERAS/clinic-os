"use client";
import { PageHeader } from "@/components/shared/page-header";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Wifi, WifiOff, Search, XCircle, Activity, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { StatusBadge } from "@/components/admin";

function KpiCard({ icon: Icon, label, value, sub, variant = "neutral", action }) {
  const v = {
    failed: { container: "border-l-4 border-l-red-500", icon: "text-red-600", value: "text-red-700", label: "text-slate-500" },
    warning: { container: "border-l-4 border-l-amber-500", icon: "text-amber-600", value: "text-amber-700", label: "text-slate-500" },
    pending: { container: "border-l-4 border-l-blue-500", icon: "text-blue-600", value: "text-blue-700", label: "text-slate-500" },
    healthy: { container: "", icon: "text-slate-400", value: "text-slate-900", label: "text-slate-500" },
  }[variant] || { container: "", icon: "text-slate-400", value: "text-slate-900", label: "text-slate-500" };

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm", v.container)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={cn("size-4 shrink-0", v.icon)} />
          <p className={cn("text-xs font-medium truncate", v.label)}>{label}</p>
        </div>
      </div>
      <div className="flex items-baseline justify-between mt-0.5">
        <p className={cn("text-xl font-bold tracking-tight", v.value)}>{value ?? "—"}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center gap-0.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
          >
            {action.label} <ArrowRight className="size-3" />
          </button>
        )}
      </div>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SuperAdminWhatsappHealth() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  async function fetchData() {
    setLoading(true);
    try {
      const [credsRes, msgsRes, clinicsRes] = await Promise.all([
        supabase.from("whatsapp_credentials").select("id, clinic_id, is_connected, health_check_passed, last_health_check_at, failure_reason"),
        supabase.from("whatsapp_messages").select("id, status, clinic_id, created_at"),
        supabase.from("clinics").select("id, name"),
      ]);
      const credentials = credsRes.data ?? [];
      const messages = msgsRes.data ?? [];
      const allClinics = clinicsRes.data ?? [];
      const totalConnected = credentials.filter(c => c.is_connected).length;
      const totalDisconnected = credentials.filter(c => !c.is_connected).length;
      const totalFailedHealth = credentials.filter(c => c.is_connected && c.health_check_passed === false).length;
      const today = new Date().toDateString();
      const todayMessages = messages.filter(m => new Date(m.created_at).toDateString() === today);
      const todaySent = todayMessages.filter(m => m.status === "sent" || m.status === "delivered").length;
      const todayFailed = todayMessages.filter(m => m.status === "failed").length;
      const clinicCreds = {};
      credentials.forEach(c => { clinicCreds[c.clinic_id] = c; });
      const clinicList = allClinics.map(cl => ({
        ...cl,
        credential: clinicCreds[cl.id] || null,
        messageCount: messages.filter(m => m.clinic_id === cl.id).length,
        failedCount: messages.filter(m => m.clinic_id === cl.id && m.status === "failed").length,
        lastMessage: messages.filter(m => m.clinic_id === cl.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0],
      }));
      const retryCount = messages.filter(m => m.status === "failed").length;
      setStats({
        connected: totalConnected, disconnected: totalDisconnected, failedHealth: totalFailedHealth,
        totalWithCreds: credentials.length, todaySent, todayFailed, retryCount,
      });
      setClinics(clinicList);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function testConnection(clinicId) {
    try {
      toast.success("Testing connection... (simulated)");
    } catch (err) {
      toast.error(err.message || "Connection test failed");
    }
  }

  const filtered = clinics.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );
  const failureClinics = clinics.filter(c =>
    c.credential && c.credential.is_connected && c.credential.health_check_passed === false
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const deliveryRate = stats?.todaySent > 0
    ? Math.round((stats.todaySent / (stats.todaySent + (stats.todayFailed || 0))) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="WhatsApp Health" description="Monitor WhatsApp connectivity and message delivery across all clinics.">
        <button onClick={fetchData}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw className="size-4" /> Refresh
        </button>
      </PageHeader>

      {/* FAILED */}
      {(stats?.failedHealth > 0 || stats?.disconnected > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="size-4 text-red-500" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-red-600">Needs attention</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats?.failedHealth > 0 && (
              <KpiCard icon={AlertTriangle} label="Failed health checks" value={stats.failedHealth}
                variant="failed" action={{ label: "Investigate", onClick: () => {
                  const el = document.getElementById("failed-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}} />
            )}
            {stats?.disconnected > 0 && (
              <KpiCard icon={WifiOff} label="Disconnected" value={stats.disconnected}
                sub={`out of ${stats?.totalWithCreds ?? 0} with credentials`}
                variant="failed" action={{ label: "View", onClick: () => {} }} />
            )}
          </div>
        </div>
      )}

      {/* WARNINGS */}
      {stats?.retryCount > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-amber-500" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-600">Warnings</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={RefreshCw} label="Retry queue" value={stats.retryCount}
              sub="failed messages waiting" variant="warning" />
          </div>
        </div>
      )}

      {/* HEALTHY */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="size-4 text-slate-400" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Connection Status</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={Wifi} label="Connected clinics" value={stats?.connected ?? "—"}
            sub={`out of ${stats?.totalWithCreds ?? 0} with credentials`} variant="healthy" />
          <KpiCard icon={MessageCircle} label="Messages today" value={stats?.todaySent?.toLocaleString() ?? "—"}
            variant="healthy" />
          <KpiCard icon={CheckCircle2} label="Delivery rate" value={`${deliveryRate}%`}
            variant="healthy" />
          <KpiCard icon={AlertTriangle} label="Failed today" value={stats?.todayFailed ?? "—"}
            variant={stats?.todayFailed > 0 ? "warning" : "healthy"} />
        </div>
      </div>

      {/* FAILED HEALTH CHECKS SECTION */}
      {failureClinics.length > 0 && (
        <div id="failed-section" className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
            <AlertTriangle className="size-4 text-red-500" />
            <p className="text-sm font-semibold text-slate-900">Failed Health Checks</p>
          </div>
          <div className="divide-y divide-slate-100">
            {failureClinics.map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                <div>
                  <span className="text-sm font-medium text-slate-900">{c.name}</span>
                  <span className="ml-2 text-xs text-slate-400">{c.credential?.failure_reason || "Health check failed"}</span>
                </div>
                <button onClick={() => testConnection(c.id)}
                  className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Test Connection
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH + TABLE */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search clinics..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-300 focus:ring-1 focus:ring-slate-300" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Connection Status</h2>
        </div>
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No clinics found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Clinic</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Health</th>
                  <th className="px-5 py-3">Webhook</th>
                  <th className="px-5 py-3">Last Check</th>
                  <th className="px-5 py-3">Messages</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(cl => {
                  const webhookActive = cl.credential?.last_health_check_at
                    && (Date.now() - new Date(cl.credential.last_health_check_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
                  return (
                    <tr key={cl.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-900">{cl.name}</td>
                      <td className="px-5 py-3">
                        {cl.credential?.is_connected ? (
                          <StatusBadge status="active" label="Connected" dot={true} />
                        ) : (
                          <StatusBadge status="inactive" label={cl.credential ? "Disconnected" : "Not set up"} dot={true} />
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {cl.credential?.health_check_passed === false ? (
                          <StatusBadge status="failed" label="Failed" dot={true} />
                        ) : cl.credential?.health_check_passed === true ? (
                          <StatusBadge status="active" label="Passed" dot={true} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("inline-flex items-center gap-1 text-xs",
                          webhookActive ? "text-emerald-600" : "text-slate-400")}>
                          {webhookActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {cl.credential?.last_health_check_at
                          ? new Date(cl.credential.last_health_check_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {cl.messageCount > 0 ? `${cl.messageCount} total` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button onClick={() => testConnection(cl.id)}
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                            Test
                          </button>
                          {cl.credential && (
                            <button onClick={() => toast.success("Opening logs (simulated)")}
                              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                              Logs
                            </button>
                          )}
                          {cl.credential?.is_connected && (
                            <button onClick={() => toast.success(`WhatsApp disabled for ${cl.name} (simulated)`)}
                              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50 transition-colors">
                              Disable
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

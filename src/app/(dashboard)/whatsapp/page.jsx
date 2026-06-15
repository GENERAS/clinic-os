"use client";
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { WhatsAppStatusBadge } from "@/features/whatsapp/components/WhatsAppStatusBadge";
import { MESSAGE_STATUS_LABELS, MESSAGE_TYPE_LABELS } from "@/features/whatsapp/types";
import { getWhatsAppService } from "@/features/whatsapp/services/whatsapp.service";
import { useAuth } from "@/features/auth/hooks/use-auth";

function StatCard({ label, value, sub, color }) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${color || "text-foreground"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function RetryButton({ messageId, clinicId, userId, onRetry }) {
  const [retrying, setRetrying] = useState(false);
  const handleRetry = async () => {
    setRetrying(true);
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase.from("whatsapp_messages").update({
        status: "queued", failed_at: null, error_message: null, sent_at: null,
      }).eq("id", messageId);
      onRetry(messageId);
    } finally {
      setRetrying(false);
    }
  };
  return (
    <button onClick={handleRetry} disabled={retrying} className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50">
      {retrying ? "Retrying..." : "Retry"}
    </button>
  );
}

export default function WhatsAppPage() {
  const { user } = useAuth();
  const whatsapp = getWhatsAppService();
  const clinicId = user?.clinicId;

  const [stats, setStats] = useState({ sent: 0, delivered: 0, failed: 0, total: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [failedLogs, setFailedLogs] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState({ connected: false, last_successful_message: null });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [statusData, allLogsResult, failedResult] = await Promise.all([
        whatsapp.getConnectionStatus(clinicId),
        whatsapp.getMessageLogs(clinicId, { page: 0, pageSize: 20 }),
        whatsapp.getMessageLogs(clinicId, { page: 0, pageSize: 50, status: "failed" }),
      ]);
      setConnectionStatus(statusData);
      setRecentLogs(allLogsResult.data || []);
      setFailedLogs(failedResult.data || []);
      const logs = allLogsResult.data || [];
      setStats({
        total: logs.length,
        sent: logs.filter((l) => l.status === "sent").length,
        delivered: logs.filter((l) => l.status === "delivered" || l.status === "read").length,
        failed: logs.filter((l) => l.status === "failed").length,
      });
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!clinicId) return null;

  const deliveryRate = stats.total > 0
    ? Math.round((stats.delivered / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Automation"
        description="Silent appointment reminders and patient communication"
        actions={
          <Link to="/settings/whatsapp" className="rounded-lg border border-input bg-background px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
            Configure
          </Link>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sent" value={stats.sent} color="text-blue-600" sub="Total messages sent" />
        <StatCard label="Delivered" value={stats.delivered} color="text-green-600" sub="Confirmed received" />
        <StatCard label="Failed" value={stats.failed} color="text-red-600" sub="Requires attention" />
        <StatCard label="Delivery Rate" value={`${deliveryRate}%`} sub={stats.total > 0 ? `${stats.delivered} of ${stats.total} delivered` : "No data yet"} />
      </div>

      {/* Connection Status */}
      <SectionCard title="Connection Status">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${connectionStatus?.connected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm font-medium text-foreground">
            {connectionStatus?.connected ? "Connected" : "Disconnected"}
          </span>
          <span className="text-xs text-muted-foreground">
            Provider: Meta WhatsApp Cloud API
          </span>
          {connectionStatus?.last_successful_message && (
            <span className="text-xs text-muted-foreground ml-auto">
              Last success: {new Date(connectionStatus.last_successful_message).toLocaleString()}
            </span>
          )}
        </div>
      </SectionCard>

      {/* Failure Panel */}
      {failedLogs.length > 0 && (
        <SectionCard
          title={`Failed Messages (${failedLogs.length})`}
          className="border-red-200 dark:border-red-900"
        >
          <div className="space-y-2">
            {failedLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-lg bg-red-50 dark:bg-red-950/30 px-3.5 py-2.5 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium text-foreground">{log.patient_name || "—"}</span>
                  <span className="text-xs text-muted-foreground">{MESSAGE_TYPE_LABELS[log.message_type]}</span>
                  <span className="text-xs text-red-600">
                    {log.failed_at ? new Date(log.failed_at).toLocaleString() : ""}
                  </span>
                </div>
                <RetryButton messageId={log.id} clinicId={clinicId} userId={user?.id} onRetry={loadData} />
              </div>
            ))}
            {failedLogs.length > 5 && (
              <Link to="/whatsapp/logs?status=failed" className="block text-center text-xs font-medium text-primary hover:text-primary/80 pt-1">
                View all {failedLogs.length} failed messages
              </Link>
            )}
          </div>
        </SectionCard>
      )}

      {/* Recent Message Log */}
      <SectionCard
        title="Recent Messages"
        actions={
          <Link to="/whatsapp/logs" className="text-xs font-medium text-primary hover:text-primary/80">
            View all logs
          </Link>
        }
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : recentLogs.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No messages sent yet. Configure your reminders in settings.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Patient</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Sent</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-foreground">{log.patient_name || "—"}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{MESSAGE_TYPE_LABELS[log.message_type]}</td>
                    <td className="px-5 py-3"><WhatsAppStatusBadge status={log.status} /></td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {log.sent_at ? new Date(log.sent_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Link to={`/whatsapp/logs/${log.id}`} className="text-xs font-medium text-primary hover:text-primary/80">
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

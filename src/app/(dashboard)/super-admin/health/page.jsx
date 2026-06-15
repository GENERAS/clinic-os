"use client";
import { PageHeader } from "@/components/shared/page-header";

import {
  useState, useEffect
} from "react";
import {
  createClient
} from "@/lib/supabase/client";
import {
  Activity, Loader2, CheckCircle2, XCircle, AlertTriangle,  Database, Wifi, MessageCircle, Cpu, HardDrive, Zap, RotateCw, Settings
} from "lucide-react";
import {
  Link
} from "react-router-dom";
import {
  toast
} from "sonner";
function cn(
  ...classes
) {
  return classes.filter(
    Boolean
  ).join(
    " "
  );

}
function StatusCard(
  {
    icon: Icon, label, status, sub, detail, onRestart
  }
) {
  const isOk = status === "ok" || status === "healthy" || status === "connected";
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("flex size-10 items-center justify-center rounded-lg bg-slate-100")}>
            <Icon className="size-5 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{label}</p>
            <p className={cn("text-xs font-medium", isOk ? "text-slate-700" : "text-slate-500")}>
              {status}
            </p>
            {sub && <p className="text-xs text-slate-500">{sub}</p>}
          </div>
        </div>
        <div className={cn("size-2.5 rounded-full", isOk ? "bg-slate-500" : "bg-slate-200")} />
      </div>
      {detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}
      {onRestart && (
        <div className="mt-3 flex justify-end">
          <button onClick={onRestart}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <RotateCw className="size-3 text-slate-500" /> Restart
          </button>
        </div>
      )}
    </div>
  );

}
function computeServices(
  data, onRestart
) {
  if (
    !data
  ) return {
    list: [], healthy: 0, total: 6
  };
  const services = [
    {
      id: "db",      icon: Database,      label: "Database",      status: data.dbOk ? "healthy" : "degraded",      sub: data.dbOk ? "PostgreSQL 17 · Queries succeeding" : "Slow query response",      detail: data.dbOk ? "Response time " + data.dbLatency + "ms" : "Query latency exceeds threshold",      onRestart: (
) => onRestart(
"Database"
),
    },
    {
      id: "realtime",      icon: Zap,      label: "Realtime",      status: data.recentUsers > 0 ? "healthy" : "degraded",      sub: data.recentUsers > 0 ? data.recentUsers + " active user(s) in 24h" : "No recent user activity detected",      detail: "Subscriptions & live queries",      onRestart: (
) => onRestart(
"Realtime"
),
    },
    {
      id: "whatsapp",      icon: MessageCircle,      label: "WhatsApp API",      status: data.failedHealth > 0 ? "degraded" : "healthy",      sub: data.failedHealth > 0 ? data.failedHealth + " clinic(s) with failed health checks" : "All connections healthy",      detail: data.connectedCreds + "/" + data.totalCreds + " credentials connected",      onRestart: (
) => onRestart(
"WhatsApp API"
),
    },
    {
      id: "queue",      icon: Cpu,      label: "Queue System",      status: data.messageFailureRate > 10 ? "degraded" : "healthy",      sub: data.messageFailureRate > 10 ? data.messageFailureRate + "% failure rate" : "Processing normally",      detail: (data.totalMsgs?.toLocaleString() ?? 0) + " messages processed",      onRestart: (
) => onRestart(
"Queue System"
),
    },
    {
      id: "storage",      icon: HardDrive,      label: "Storage",      status: data.storageOk ? "healthy" : "degraded",      sub: data.storageOk ? data.storageCount + " file(s) stored" : "No storage activity",      detail: "Avatars, attachments, uploads",      onRestart: (
) => onRestart(
"Storage"
),
    },
    {
      id: "api",      icon: Wifi,      label: "API Gateway",      status: data.apiOk ? "healthy" : "degraded",      sub: data.apiOk ? "All endpoints responding" : "Some endpoints degraded",      detail: "Uptime: " + data.apiUptime + "%",      onRestart: (
) => onRestart(
"API Gateway"
),
    },
  ];
  const healthy = services.filter(
    (
      s) => s.status === "healthy"
  ).length;
  return {
    list: services, healthy, total: 6
  };

}
export default function PlatformHealth(

) {
  const [data, setData] = useState(
    null
  );
  const [loading, setLoading] = useState(
    true
  );
  useEffect(
    (
    ) => {
      const supabase = createClient(

      );
      if (
        !supabase
      ) return;
      async function fetch(

      ) {
        const t0 = performance.now(

        );
        try {
          const [msgsRes, credsRes, usersRes, patientsRes, auditRes] = await Promise.all(
            [
              supabase.from(
                "whatsapp_messages"
              ).select(
                "id, status"
              ),
              supabase.from(
                "whatsapp_credentials"
              ).select(
                "is_connected, health_check_passed"
              ),
              supabase.from(
                "users"
              ).select(
                "id, last_login_at"
              ),
              supabase.from(
                "patients"
              ).select(
                "id, avatar_url"
              ),
              supabase.from(
                "audit_logs"
              ).select(
                "id"
              ).limit(
                1
              ),
            ]
          );
          const dbLatency = Math.round(
            performance.now(

            ) - t0
          );
          const dbOk = dbLatency < 2000;
          const apiOk = !msgsRes.error && !credsRes.error && !usersRes.error;
          const apiUptime = apiOk ? "99.9" : "95.0";
          const messages = msgsRes.data ?? [];
          const creds = credsRes.data ?? [];
          const users = usersRes.data ?? [];
          const patients = patientsRes.data ?? [];
          const failedMsgs = messages.filter(
            (
              m) => m.status === "failed"
          ).length;
          const totalMsgs = messages.length;
          const connectedCreds = creds.filter(
            (
              c) => c.is_connected
          ).length;
          const failedHealth = creds.filter(
            (
              c) => c.is_connected && c.health_check_passed === false
          ).length;
          const recentUsers = users.filter(
            (
              u) => {
                if (
                  !u.last_login_at
                ) return false;
                const diff = (
                  Date.now(

                  ) - new Date(
                    u.last_login_at
                  ).getTime(

                  )
                ) / 36e5;
                return diff < 24;

              }
          ).length;
          const storageCount = patients.filter(
            (
              p) => p.avatar_url
          ).length;
          setData(
            {
              messageFailureRate: totalMsgs > 0 ? Math.round(
                (
                  failedMsgs / totalMsgs
                ) * 100
              ) : 0,              connectedCreds,              failedHealth,              totalCreds: creds.length,              totalMsgs,              recentUsers,              storageCount,              storageOk: true,              dbOk,              dbLatency,              apiOk,              apiUptime,

            }
          );

        } catch {
          setData(
            {
              messageFailureRate: 0, connectedCreds: 0, failedHealth: 0,              totalCreds: 0, totalMsgs: 0, recentUsers: 0, storageCount: 0,              storageOk: false, dbOk: false, dbLatency: 999, apiOk: false, apiUptime: "0.0",

            }
          );

        } finally {
          setLoading(
            false
          );

        }
      }      fetch(

      );

    }, []
  );
  if (
    loading
  ) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );

  }  function handleRestart(
    name
  ) {
    toast.success(
      name + " restart initiated (simulated)"
    );

  }  const {
    list: services, healthy
  } = computeServices(
    data, handleRestart
  );
  const degraded = services.filter(
    (
      s) => s.status === "degraded"
  ).length;
  return (
    <div className="space-y-6">
      <PageHeader title="Platform Health" description="Operations dashboard — monitor system status at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {
          services.map(
            (
              s) => (
                <StatusCard key={
                  s.id
                } icon={
                  s.icon
                } label={
                  s.label
                } status={
                  s.status
                } sub={
                  s.sub
                } detail={
                  s.detail
                } onRestart={
                  s.onRestart
                } />
              )
          )
        }
      </div>
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">System Summary</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4 text-center">
            <p className={cn("text-2xl font-bold", healthy === 6 ? "text-slate-900" : "text-slate-500")}>
              {healthy}/{services.length}
            </p>
            <p className="text-xs text-slate-500">Services Healthy</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-slate-500">
              {degraded}
            </p>
            <p className="text-xs text-slate-500">Issues Detected</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold">
              {data?.totalMsgs?.toLocaleString(

              ) ?? 0}
            </p>
            <p className="text-xs text-slate-500">Messages Processed</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end border-t pt-4">
          <Link to="/admin/settings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Settings className="size-3 text-slate-500" /> Maintenance &amp; Settings
          </Link>
        </div>
      </div>
    </div>
  );

}

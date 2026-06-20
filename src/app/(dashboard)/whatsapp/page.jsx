"use client";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/page-header";
import { Bell, Check, ChevronDown, Clock, Edit3, Eye, Loader2, MessageSquare, Plus, RefreshCw, Save, Smartphone, Trash2, X } from "lucide-react";
import { WhatsAppStatusBadge } from "@/features/whatsapp/components/WhatsAppStatusBadge";
import { getWhatsAppService } from "@/features/whatsapp/services/whatsapp.service";
import { getWhatsAppAutomationService } from "@/features/whatsapp/services/whatsapp-automation.service";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { toast } from "sonner";

const MESSAGE_TYPE_LABELS = {
  appointment_confirmation: "Confirmation",
  appointment_reminder: "Reminder",
  appointment_cancelled: "Cancellation",
  appointment_rescheduled: "Rescheduled",
  follow_up: "Follow-up",
  medication_reminder: "Medication",
  survey: "Survey",
  welcome_message: "Welcome",
  system_notification: "System",
  inbound: "Inbound",
};

const REMINDER_OPTIONS = [1, 3, 12, 24, 48];

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
        {Icon && <Icon className={`size-4 ${color || "text-slate-400"}`} />}
      </div>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${color || "text-slate-900"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function StatusDot({ connected }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${connected ? "text-emerald-600" : "text-red-500"}`}>
      <span className={`size-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`} />
      {connected ? "Connected" : "Disconnected"}
    </span>
  );
}

function TemplateEditor({ templates, clinicId, onSave }) {
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleSave = async (t) => {
    try {
      const svc = getWhatsAppService();
      await svc.updateTemplate(clinicId, t.id, { content: editing.content, is_active: t.is_active }, null);
      toast.success("Template saved");
      setEditing(null);
      onSave();
    } catch {
      toast.error("Failed to save template");
    }
  };

  const handleToggleActive = async (t) => {
    try {
      const svc = getWhatsAppService();
      await svc.updateTemplate(clinicId, t.id, { is_active: !t.is_active }, null);
      toast.success(t.is_active ? "Template deactivated" : "Template activated");
      onSave();
    } catch {
      toast.error("Failed to update template");
    }
  };

  if (templates.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No templates yet.</p>;
  }

  return (
    <div className="space-y-2">
      {templates.map((t) => (
        <div key={t.id} className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`size-2 rounded-full ${t.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />
              <span className="text-sm font-medium text-slate-900">{MESSAGE_TYPE_LABELS[t.template_type] || t.name}</span>
              <span className="text-xs text-slate-400">{t.template_type}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPreview(preview?.id === t.id ? null : t)} className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <Eye className="size-3.5" />
              </button>
              <button onClick={() => setEditing(editing?.id === t.id ? null : { ...t })} className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <Edit3 className="size-3.5" />
              </button>
              <button onClick={() => handleToggleActive(t)} className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                {t.is_active ? <X className="size-3.5" /> : <Check className="size-3.5" />}
              </button>
            </div>
          </div>
          {preview?.id === t.id && (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
              <p className="whitespace-pre-wrap text-xs text-slate-600">{t.content}</p>
            </div>
          )}
          {editing?.id === t.id && (
            <div className="border-t border-slate-100 px-4 py-3 space-y-3">
              <textarea
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              <div className="flex gap-2">
                <button onClick={() => handleSave(t)} className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500">
                  <Save className="size-3" /> Save
                </button>
                <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function WhatsAppPage() {
  const navigate = useNavigate();
  const { clinic: authClinic } = useAuth();
  const clinicId = authClinic?.id;
  const whatsapp = getWhatsAppService();
  const automation = getWhatsAppAutomationService();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ stats: {}, settings: null, templates: [], logs: [], failed: [], connection: {} });
  const [settingsForm, setSettingsForm] = useState({ reminders_enabled: false, reminder_hours: [24, 3] });
  const [savingSettings, setSavingSettings] = useState(false);

  const loadData = useCallback(async () => {
    if (!clinicId) return;
    try {
      const [settingsData, templatesData, logsResult, failedResult, statusData] = await Promise.all([
        automation.ensureSettings(clinicId),
        whatsapp.getTemplates(clinicId),
        whatsapp.getMessageLogs(clinicId, { page: 0, pageSize: 10 }),
        whatsapp.getMessageLogs(clinicId, { page: 0, pageSize: 50, status: "failed" }),
        whatsapp.getConnectionStatus(clinicId),
      ]);
      await automation.ensureDefaultTemplates(clinicId);
      const refreshedTemplates = await whatsapp.getTemplates(clinicId);
      setData({
        stats: {
          total: logsResult.total || 0,
          sent: logsResult.data?.filter((l) => l.status === "sent").length || 0,
          delivered: logsResult.data?.filter((l) => l.status === "delivered" || l.status === "read").length || 0,
          failed: failedResult.total || 0,
          queued: logsResult.data?.filter((l) => l.status === "queued").length || 0,
        },
        settings: settingsData,
        templates: refreshedTemplates,
        logs: logsResult.data || [],
        failed: failedResult.data || [],
        connection: statusData,
      });
      if (settingsData) {
        setSettingsForm({
          reminders_enabled: settingsData.reminders_enabled || false,
          reminder_hours: settingsData.reminder_hours || [24, 3],
        });
      }
    } catch (err) {
      console.error("Failed to load WhatsApp data", err);
    } finally {
      setLoading(false);
    }
  }, [clinicId, whatsapp, automation]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveSettings = async () => {
    if (!clinicId) return;
    setSavingSettings(true);
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase.from("whatsapp_settings").update({
        reminders_enabled: settingsForm.reminders_enabled,
        reminder_hours: settingsForm.reminder_hours,
      }).eq("clinic_id", clinicId);
      toast.success("Reminder settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRetry = async (messageId) => {
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase.from("whatsapp_messages").update({ status: "queued", failed_at: null, error_message: null }).eq("id", messageId);
      toast.success("Message queued for retry");
      loadData();
    } catch {
      toast.error("Failed to retry");
    }
  };

  if (!clinicId) return null;

  const deliveryRate = data.stats.total > 0 ? Math.round((data.stats.delivered / data.stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="WhatsApp" description="Patient communication automation and self-service booking" />

      {/* Overview KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Connection" value={<StatusDot connected={data.connection?.connected} />} icon={Smartphone} />
        <StatCard label="Sent" value={data.stats.sent} color="text-slate-900" icon={MessageSquare} />
        <StatCard label="Delivered" value={data.stats.delivered} color="text-emerald-600" icon={Check} />
        <StatCard label="Failed" value={data.stats.failed} color="text-red-500" icon={X} />
        <StatCard label="Delivery Rate" value={`${deliveryRate}%`} sub={data.stats.total > 0 ? `${data.stats.delivered}/${data.stats.total}` : "N/A"} />
        <StatCard label="Queued" value={data.stats.queued} color="text-amber-500" icon={Clock} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Settings + Templates */}
        <div className="space-y-6 lg:col-span-2">
          {/* Connection Status */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`size-2.5 rounded-full ${data.connection?.connected ? "bg-emerald-500" : "bg-red-500"}`} />
                <span className="text-sm font-medium text-slate-900">
                  {data.connection?.connected ? "WhatsApp Connected" : "WhatsApp Disconnected"}
                </span>
                {data.connection?.last_successful_message && (
                  <span className="text-xs text-slate-500">
                    Last success: {new Date(data.connection.last_successful_message).toLocaleString()}
                  </span>
                )}
              </div>
              <Link to="/settings/whatsapp" className="text-xs font-medium text-teal-600 hover:text-teal-500">
                Configure
              </Link>
            </div>
          </div>

          {/* Reminder Settings */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="size-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Reminder Settings</h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settingsForm.reminders_enabled}
                  onChange={(e) => setSettingsForm({ ...settingsForm, reminders_enabled: e.target.checked })}
                  className="size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-700">Enable automatic reminders</span>
              </label>
              {settingsForm.reminders_enabled && (
                <div>
                  <label className="text-xs font-medium text-slate-500">Send reminders</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {REMINDER_OPTIONS.map((h) => (
                      <button
                        key={h}
                        onClick={() => {
                          const current = settingsForm.reminder_hours;
                          const updated = current.includes(h)
                            ? current.filter((v) => v !== h)
                            : [...current, h].sort((a, b) => a - b);
                          setSettingsForm({ ...settingsForm, reminder_hours: updated });
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          settingsForm.reminder_hours.includes(h)
                            ? "bg-teal-50 border-teal-200 text-teal-700"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {h}h {h === 1 ? "before" : h === 48 ? "before" : "before"}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Only confirmed appointments. Cancelled are skipped. Sent once.</p>
                </div>
              )}
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500 disabled:opacity-50"
              >
                {savingSettings ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                Save Settings
              </button>
            </div>
          </div>

          {/* Templates */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="size-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">Message Templates</h3>
              </div>
              <button onClick={loadData} className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <RefreshCw className="size-3.5" />
              </button>
            </div>
            <TemplateEditor templates={data.templates} clinicId={clinicId} onSave={loadData} />
          </div>
        </div>

        {/* Right column: Logs + Failed */}
        <div className="space-y-6">
          {/* Recent Logs */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Recent Messages</h3>
              <Link to="/whatsapp/logs" className="text-xs font-medium text-teal-600 hover:text-teal-500">View all</Link>
            </div>
            {data.logs.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No messages yet.</p>
            ) : (
              <div className="space-y-2">
                {data.logs.map((log) => (
                  <Link key={log.id} to={`/whatsapp/logs/${log.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{log.patient_name || "—"}</p>
                      <p className="text-[11px] text-slate-400">{MESSAGE_TYPE_LABELS[log.message_type] || log.message_type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <WhatsAppStatusBadge status={log.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Failed Messages */}
          {data.failed.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-red-700">Failed ({data.failed.length})</h3>
              </div>
              <div className="space-y-2">
                {data.failed.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{log.patient_name || "—"}</p>
                      <p className="text-[11px] text-red-500">{log.failed_at ? new Date(log.failed_at).toLocaleString() : ""}</p>
                    </div>
                    <button onClick={() => handleRetry(log.id)} className="shrink-0 rounded bg-white px-2 py-1 text-[11px] font-medium text-red-600 border border-red-200 hover:bg-red-50">
                      Retry
                    </button>
                  </div>
                ))}
              </div>
              {data.failed.length > 10 && (
                <Link to="/whatsapp/logs?status=failed" className="mt-2 block text-center text-xs font-medium text-teal-600 hover:text-teal-500">
                  View all {data.failed.length} failed
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

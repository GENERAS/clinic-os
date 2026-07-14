"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2, Shield, Eye, Clock, FileText, Lock, Search, Filter,
  CheckCircle2, XCircle, AlertTriangle, User, Key, EyeOff
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getPrivacyService } from "@/features/privacy/services/privacy.service";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const TABS = [
  { id: "consent", label: "Consent", icon: Shield },
  { id: "access", label: "Data Access", icon: Eye },
  { id: "audit", label: "Audit Trail", icon: Clock },
  { id: "retention", label: "Retention", icon: FileText },
  { id: "masking", label: "Data Masking", icon: Lock },
];

const CONSENT_TYPES = ["treatment", "data_sharing", "marketing", "research", "insurance_claim", "referral"];
const ENTITY_TYPES = ["patient", "consultation", "invoice", "prescription", "appointment", "lab_result", "insurance"];
const ACTION_TYPES = ["create", "read", "update", "delete", "export", "share"];

const FORMAT_DATE = (d) => d ? new Date(d).toLocaleDateString("en-RW", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "\u2014";

export default function PrivacyPage() {
  const { clinic: authClinic, user } = useAuth();
  const clinicId = authClinic?.id;
  const service = useMemo(() => getPrivacyService(), []);

  const [activeTab, setActiveTab] = useState("consent");
  const [loading, setLoading] = useState(true);

  const [consents, setConsents] = useState([]);
  const [consentTypeFilter, setConsentTypeFilter] = useState("");
  const [consentStatusFilter, setConsentStatusFilter] = useState("");

  const [accessLogs, setAccessLogs] = useState([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessFilters, setAccessFilters] = useState({ user_id: "", entity_type: "", action: "" });

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState({ entity_type: "", user_id: "", action: "" });

  const [retentionPolicies, setRetentionPolicies] = useState([]);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [showRetentionForm, setShowRetentionForm] = useState(false);
  const [retentionForm, setRetentionForm] = useState({ entity_type: "patient", retention_days: "2555", action: "archive", description: "" });
  const [retentionSaving, setRetentionSaving] = useState(false);

  const [maskInput, setMaskInput] = useState({ full_name: "Jean Baptiste Uwimana", phone: "+250788123456", national_id: "1199720012345678", email: "jean@clinic.rw" });
  const [maskResult, setMaskResult] = useState(null);

  const loadConsents = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("patient_consents")
        .select("*, patients(id, full_name)")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setConsents(data || []);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load consents"));
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  const loadAccessLogs = useCallback(async () => {
    if (!clinicId) return;
    setAccessLoading(true);
    try {
      const filters = {};
      if (accessFilters.user_id) filters.user_id = accessFilters.user_id;
      if (accessFilters.entity_type) filters.entity_type = accessFilters.entity_type;
      if (accessFilters.action) filters.action = accessFilters.action;
      const data = await service.getDataAccessLogs(clinicId, filters);
      setAccessLogs(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load access logs"));
    } finally {
      setAccessLoading(false);
    }
  }, [clinicId, service, accessFilters]);

  const loadAuditLogs = useCallback(async () => {
    if (!clinicId) return;
    setAuditLoading(true);
    try {
      const filters = {};
      if (auditFilters.entity_type) filters.entity_type = auditFilters.entity_type;
      if (auditFilters.user_id) filters.user_id = auditFilters.user_id;
      if (auditFilters.action) filters.action = auditFilters.action;
      const data = await service.getAuditTrail(clinicId, filters);
      setAuditLogs(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load audit trail"));
    } finally {
      setAuditLoading(false);
    }
  }, [clinicId, service, auditFilters]);

  const loadRetention = useCallback(async () => {
    if (!clinicId) return;
    setRetentionLoading(true);
    try {
      const data = await service.getRetentionPolicies(clinicId);
      setRetentionPolicies(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load retention policies"));
    } finally {
      setRetentionLoading(false);
    }
  }, [clinicId, service]);

  useEffect(() => { loadConsents(); }, [loadConsents]);
  useEffect(() => { if (activeTab === "access") loadAccessLogs(); }, [activeTab, loadAccessLogs]);
  useEffect(() => { if (activeTab === "audit") loadAuditLogs(); }, [activeTab, loadAuditLogs]);
  useEffect(() => { if (activeTab === "retention") loadRetention(); }, [activeTab, loadRetention]);

  const filteredConsents = useMemo(() => {
    let result = consents;
    if (consentTypeFilter) result = result.filter(c => c.consent_type === consentTypeFilter);
    if (consentStatusFilter === "active") result = result.filter(c => c.consent_given && (!c.expiry_date || new Date(c.expiry_date) >= new Date()));
    if (consentStatusFilter === "revoked") result = result.filter(c => !c.consent_given || (c.expiry_date && new Date(c.expiry_date) < new Date()));
    return result;
  }, [consents, consentTypeFilter, consentStatusFilter]);

  const handleRevokeConsent = useCallback(async (consentId) => {
    if (!clinicId) return;
    try {
      await service.revokePatientConsent(clinicId, consentId);
      toast.success("Consent revoked");
      loadConsents();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to revoke consent"));
    }
  }, [clinicId, service, loadConsents]);

  const handleSaveRetention = useCallback(async () => {
    if (!clinicId) return;
    setRetentionSaving(true);
    try {
      await service.upsertRetentionPolicy(clinicId, {
        entity_type: retentionForm.entity_type,
        retention_days: parseInt(retentionForm.retention_days) || 365,
        action: retentionForm.action || "archive",
        description: retentionForm.description || null,
      });
      toast.success("Retention policy saved");
      setShowRetentionForm(false);
      setRetentionForm({ entity_type: "patient", retention_days: "2555", action: "archive", description: "" });
      loadRetention();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to save retention policy"));
    } finally {
      setRetentionSaving(false);
    }
  }, [clinicId, retentionForm, service, loadRetention]);

  const handleRunMasking = useCallback(() => {
    const result = service.maskSensitiveData(maskInput, ["full_name", "phone", "national_id", "email"]);
    setMaskResult(result);
  }, [maskInput, service]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Data Privacy & Audit" description="Manage consent, access logs, and data retention" />

      <div className="flex items-center gap-1 rounded-xl border bg-white p-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-50"}`}>
              <Icon className="size-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "consent" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select value={consentTypeFilter} onChange={e => setConsentTypeFilter(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Types</option>
              {CONSENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
            <select value={consentStatusFilter} onChange={e => setConsentStatusFilter(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
          {filteredConsents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <Shield className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No consent records found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConsents.map(consent => {
                const isActive = consent.consent_given && (!consent.expiry_date || new Date(consent.expiry_date) >= new Date());
                return (
                  <div key={consent.id} className="rounded-xl border bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{consent.patients?.full_name || "Unknown Patient"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {consent.consent_type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          {consent.consent_date ? " · " : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isActive ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
                          {isActive ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                          {isActive ? "Active" : "Revoked"}
                        </span>
                        {isActive && (
                          <button onClick={() => handleRevokeConsent(consent.id)}
                            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium text-red-600 border-red-200 hover:bg-red-50 transition-colors">
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                    {consent.expiry_date && (
                      <p className="mt-2 text-[10px] text-muted-foreground">Expires: {new Date(consent.expiry_date).toLocaleDateString()}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "access" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select value={accessFilters.entity_type} onChange={e => setAccessFilters(prev => ({ ...prev, entity_type: e.target.value }))}
              className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Entities</option>
              {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={accessFilters.action} onChange={e => setAccessFilters(prev => ({ ...prev, action: e.target.value }))}
              className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Actions</option>
              {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={loadAccessLogs} disabled={accessLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
              {accessLoading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />} Search
            </button>
          </div>
          {accessLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : accessLogs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <Eye className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No data access logs found</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">User</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Action</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Entity</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Fields</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">IP</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {accessLogs.map(log => (
                      <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium">{log.users?.full_name || "System"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${log.action === "view" ? "text-blue-600 bg-blue-50" : log.action === "modify" ? "text-amber-600 bg-amber-50" : log.action === "delete" ? "text-red-600 bg-red-50" : "text-slate-600 bg-slate-50"}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{log.entity_type}{log.entity_id ? ` (${log.entity_id.slice(0, 8)})` : ""}</td>
                        <td className="px-4 py-3 text-[10px] text-muted-foreground max-w-[200px] truncate">{log.fields_accessed || "\u2014"}</td>
                        <td className="px-4 py-3 text-[10px] text-muted-foreground font-mono">{log.ip_address || "\u2014"}</td>
                        <td className="px-4 py-3 text-[10px] text-muted-foreground">{FORMAT_DATE(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select value={auditFilters.entity_type} onChange={e => setAuditFilters(prev => ({ ...prev, entity_type: e.target.value }))}
              className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Entities</option>
              {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={auditFilters.action} onChange={e => setAuditFilters(prev => ({ ...prev, action: e.target.value }))}
              className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Actions</option>
              {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={loadAuditLogs} disabled={auditLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
              {auditLoading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />} Search
            </button>
          </div>
          {auditLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <Clock className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No audit trail entries found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map(log => (
                <div key={log.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{log.action?.toUpperCase()} &mdash; {log.entity_type}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {log.users?.full_name || "System"}{log.entity_id ? ` · ID: ${log.entity_id.slice(0, 8)}...` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{FORMAT_DATE(log.created_at)}</span>
                  </div>
                  {log.old_value && (
                    <details className="mt-2">
                      <summary className="text-[10px] font-medium text-muted-foreground cursor-pointer hover:text-foreground">View changes</summary>
                      <pre className="mt-1 rounded-lg bg-muted/20 p-2 text-[10px] overflow-x-auto">{JSON.stringify(log.old_value, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "retention" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Data Retention Policies</h3>
            <button onClick={() => setShowRetentionForm(!showRetentionForm)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Key className="size-3.5" /> Configure Policy
            </button>
          </div>
          {showRetentionForm && (
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <h4 className="text-xs font-semibold">Retention Policy</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Entity Type *</label>
                  <select value={retentionForm.entity_type} onChange={e => setRetentionForm(prev => ({ ...prev, entity_type: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                    {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Retention Days *</label>
                  <input type="number" min="1" value={retentionForm.retention_days} onChange={e => setRetentionForm(prev => ({ ...prev, retention_days: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. 2555 (7 years)" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Action</label>
                  <select value={retentionForm.action} onChange={e => setRetentionForm(prev => ({ ...prev, action: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="archive">Archive</option>
                    <option value="delete">Delete</option>
                    <option value="anonymize">Anonymize</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Description</label>
                  <input value={retentionForm.description} onChange={e => setRetentionForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Optional description" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleSaveRetention} disabled={retentionSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {retentionSaving && <Loader2 className="size-3 animate-spin" />} Save Policy
                </button>
                <button onClick={() => setShowRetentionForm(false)}
                  className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
          {retentionLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : retentionPolicies.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <FileText className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No retention policies configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              {retentionPolicies.map(policy => (
                <div key={policy.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{policy.entity_type}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Retain for {policy.retention_days} days &middot; Action: {policy.action}
                      </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {policy.retention_days}d
                    </span>
                  </div>
                  {policy.description && <p className="mt-2 text-[10px] text-muted-foreground">{policy.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "masking" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-sm font-semibold mb-3">Data Masking Utility</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Demonstration of how sensitive patient data fields are masked for privacy protection.
            </p>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Original Data</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(maskInput).map(([key, val]) => (
                  <div key={key}>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">{key.replace(/_/g, " ")}</label>
                    <input value={val} onChange={e => setMaskInput(prev => ({ ...prev, [key]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                ))}
              </div>
              <button onClick={handleRunMasking}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <EyeOff className="size-3.5" /> Run Masking
              </button>
              {maskResult && (
                <>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Masked Output</h4>
                  <div className="rounded-lg bg-muted/20 p-4 space-y-2">
                    {Object.entries(maskResult).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">{key.replace(/_/g, " ")}</span>
                        <span className="text-xs font-mono font-semibold">{val}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
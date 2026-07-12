"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2, Shield, FileText, Wrench, ClipboardCheck, AlertTriangle,
  CheckCircle2, XCircle, Clock, Plus, Send, Search, ChevronDown, ChevronUp, Calendar
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getComplianceService } from "@/features/compliance/services/compliance.service";
import { getStaffService } from "@/features/staff/services/staff-service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const TABS = [
  { id: "credentials", label: "Credentials", icon: Shield },
  { id: "ipc", label: "IPC Logs", icon: ClipboardCheck },
  { id: "equipment", label: "Equipment", icon: Wrench },
  { id: "accreditation", label: "Accreditation", icon: CheckCircle2 },
  { id: "reports", label: "Reports", icon: FileText },
];

const CREDENTIAL_STATUS_STYLES = {
  active: "text-emerald-600 bg-emerald-50",
  expired: "text-red-600 bg-red-50",
  revoked: "text-gray-600 bg-gray-50",
  pending: "text-amber-600 bg-amber-50",
};

const IPC_TYPE_OPTIONS = ["hand_hygiene", "surface_disinfection", "waste_disposal", "ppe_check", "equipment_sterilization", "air_quality", "water_safety", "other"];

const REPORT_STATUS_STYLES = {
  draft: "text-amber-600 bg-amber-50",
  submitted: "text-blue-600 bg-blue-50",
  approved: "text-emerald-600 bg-emerald-50",
};

function MetricCard({ label, value, suffix, icon: Icon, color }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}{suffix || ""}</p>
        </div>
        <div className={`rounded-lg p-2 ${color || "bg-primary/10"}`}>
          <Icon className={`size-4 ${color ? "text-white" : "text-primary"}`} />
        </div>
      </div>
    </div>
  );
}

function getComplianceColor(pct) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default function CompliancePage() {
  const { clinic: authClinic, user } = useAuth();
  const clinicId = authClinic?.id;
  const service = useMemo(() => getComplianceService(), []);
  const staffService = useMemo(() => getStaffService(), []);

  const [activeTab, setActiveTab] = useState("credentials");
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  const [credentials, setCredentials] = useState([]);
  const [credFilter, setCredFilter] = useState("");
  const [staff, setStaff] = useState([]);
  const [showCredForm, setShowCredForm] = useState(false);
  const [credForm, setCredForm] = useState({ staff_id: "", credential_type: "", credential_name: "", issuing_authority: "", credential_number: "", expiry_date: "" });
  const [credSaving, setCredSaving] = useState(false);

  const [ipcLogs, setIpcLogs] = useState([]);
  const [ipcLoading, setIpcLoading] = useState(false);
  const [showIpcForm, setShowIpcForm] = useState(false);
  const [ipcForm, setIpcForm] = useState({ ipc_type: "hand_hygiene", description: "", area: "", status: "completed" });
  const [ipcSaving, setIpcSaving] = useState(false);

  const [equipment, setEquipment] = useState([]);
  const [equipLoading, setEquipLoading] = useState(false);
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [equipForm, setEquipForm] = useState({ equipment_name: "", equipment_id_tag: "", category: "", next_maintenance_date: "", maintenance_type: "", vendor: "" });
  const [equipSaving, setEquipSaving] = useState(false);

  const [accreditation, setAccreditation] = useState([]);
  const [accredLoading, setAccredLoading] = useState(false);

  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState({ report_type: "monthly", title: "", description: "" });
  const [reportSaving, setReportSaving] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const data = await service.getComplianceDashboard(clinicId);
      setDashboard(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load compliance dashboard"));
    } finally {
      setLoading(false);
    }
  }, [clinicId, service]);

  const loadCredentials = useCallback(async () => {
    if (!clinicId) return;
    try {
      const data = await service.getStaffCredentials(clinicId);
      setCredentials(data);
      const s = await staffService.getStaff(clinicId);
      setStaff(s);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load credentials"));
    }
  }, [clinicId, service, staffService]);

  const loadIPC = useCallback(async () => {
    if (!clinicId) return;
    setIpcLoading(true);
    try {
      const data = await service.getIPCLogs(clinicId);
      setIpcLogs(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load IPC logs"));
    } finally {
      setIpcLoading(false);
    }
  }, [clinicId, service]);

  const loadEquipment = useCallback(async () => {
    if (!clinicId) return;
    setEquipLoading(true);
    try {
      const data = await service.getEquipmentMaintenance(clinicId);
      setEquipment(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load equipment"));
    } finally {
      setEquipLoading(false);
    }
  }, [clinicId, service]);

  const loadAccreditation = useCallback(async () => {
    if (!clinicId) return;
    setAccredLoading(true);
    try {
      const data = await service.getAccreditationItems(clinicId);
      setAccreditation(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load accreditation items"));
    } finally {
      setAccredLoading(false);
    }
  }, [clinicId, service]);

  const loadReports = useCallback(async () => {
    if (!clinicId) return;
    setReportsLoading(true);
    try {
      const data = await service.getComplianceReports(clinicId);
      setReports(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load reports"));
    } finally {
      setReportsLoading(false);
    }
  }, [clinicId, service]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => {
    if (activeTab === "credentials") loadCredentials();
    if (activeTab === "ipc") loadIPC();
    if (activeTab === "equipment") loadEquipment();
    if (activeTab === "accreditation") loadAccreditation();
    if (activeTab === "reports") loadReports();
  }, [activeTab, loadCredentials, loadIPC, loadEquipment, loadAccreditation, loadReports]);

  const handleAddCredential = useCallback(async () => {
    if (!clinicId || !credForm.staff_id || !credForm.credential_type || !credForm.credential_name) {
      toast.error("Staff, type, and name are required");
      return;
    }
    setCredSaving(true);
    try {
      await service.createStaffCredential(clinicId, {
        staff_id: credForm.staff_id,
        credential_type: credForm.credential_type,
        credential_name: credForm.credential_name,
        issuing_authority: credForm.issuing_authority || null,
        credential_number: credForm.credential_number || null,
        expiry_date: credForm.expiry_date || null,
      });
      toast.success("Credential added");
      setShowCredForm(false);
      setCredForm({ staff_id: "", credential_type: "", credential_name: "", issuing_authority: "", credential_number: "", expiry_date: "" });
      loadCredentials();
      loadDashboard();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to add credential"));
    } finally {
      setCredSaving(false);
    }
  }, [clinicId, credForm, service, loadCredentials, loadDashboard]);

  const handleAddIPC = useCallback(async () => {
    if (!clinicId || !user) return;
    setIpcSaving(true);
    try {
      await service.createIPCLog(clinicId, ipcForm, user.id);
      toast.success("IPC log added");
      setShowIpcForm(false);
      setIpcForm({ ipc_type: "hand_hygiene", description: "", area: "", status: "completed" });
      loadIPC();
      loadDashboard();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to add IPC log"));
    } finally {
      setIpcSaving(false);
    }
  }, [clinicId, user, ipcForm, service, loadIPC, loadDashboard]);

  const handleAddEquipment = useCallback(async () => {
    if (!clinicId || !equipForm.equipment_name || !equipForm.next_maintenance_date) {
      toast.error("Equipment name and next maintenance date are required");
      return;
    }
    setEquipSaving(true);
    try {
      await service.createEquipmentMaintenance(clinicId, equipForm);
      toast.success("Equipment record added");
      setShowEquipForm(false);
      setEquipForm({ equipment_name: "", equipment_id_tag: "", category: "", next_maintenance_date: "", maintenance_type: "", vendor: "" });
      loadEquipment();
      loadDashboard();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to add equipment record"));
    } finally {
      setEquipSaving(false);
    }
  }, [clinicId, equipForm, service, loadEquipment, loadDashboard]);

  const handleToggleAccreditation = useCallback(async (item) => {
    if (!clinicId) return;
    try {
      const newStatus = item.status === "met" ? "not_met" : "met";
      await service.updateAccreditationItem(clinicId, item.id, { status: newStatus });
      setAccreditation(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
      loadDashboard();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to update accreditation item"));
    }
  }, [clinicId, service, loadDashboard]);

  const handleAddReport = useCallback(async () => {
    if (!clinicId || !user || !reportForm.title) {
      toast.error("Title is required");
      return;
    }
    setReportSaving(true);
    try {
      await service.createComplianceReport(clinicId, reportForm, user.id);
      toast.success("Report created");
      setShowReportForm(false);
      setReportForm({ report_type: "monthly", title: "", description: "" });
      loadReports();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to create report"));
    } finally {
      setReportSaving(false);
    }
  }, [clinicId, user, reportForm, service, loadReports]);

  const handleSubmitReport = useCallback(async (reportId) => {
    if (!clinicId) return;
    try {
      await service.submitComplianceReport(clinicId, reportId);
      toast.success("Report submitted");
      loadReports();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to submit report"));
    }
  }, [clinicId, service, loadReports]);

  const filteredCredentials = useMemo(() => {
    if (!credFilter) return credentials;
    const q = credFilter.toLowerCase();
    return credentials.filter(c =>
      c.status?.toLowerCase().includes(q) ||
      c.credential_type?.toLowerCase().includes(q) ||
      (c.users?.full_name || "").toLowerCase().includes(q)
    );
  }, [credentials, credFilter]);

  const accreditationByCategory = useMemo(() => {
    const map = new Map();
    accreditation.forEach(item => {
      const cat = item.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(item);
    });
    return [...map.entries()];
  }, [accreditation]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="MOH Compliance Dashboard" description="Monitor compliance across all regulatory areas" />

      {dashboard && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Credential Compliance" value={dashboard.credential_compliance_percentage} suffix="%"
            icon={Shield} color={getComplianceColor(dashboard.credential_compliance_percentage)} />
          <MetricCard label="IPC Compliance" value={dashboard.ipc_compliance_rate} suffix="%"
            icon={ClipboardCheck} color={getComplianceColor(dashboard.ipc_compliance_rate)} />
          <MetricCard label="Accreditation Score" value={dashboard.accreditation_score} suffix="%"
            icon={CheckCircle2} color={getComplianceColor(dashboard.accreditation_score)} />
          <MetricCard label="Overdue Maintenance" value={dashboard.overdue_maintenance_count}
            icon={Wrench} color={dashboard.overdue_maintenance_count > 0 ? "bg-red-500" : "bg-emerald-500"} />
          <MetricCard label="Expiring (30d)" value={dashboard.expiring_credentials_count}
            icon={AlertTriangle} color={dashboard.expiring_credentials_count > 0 ? "bg-amber-500" : "bg-emerald-500"} />
        </div>
      )}

      <div className="flex items-center gap-1 rounded-xl border bg-white p-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}>
              <Icon className="size-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "credentials" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={credFilter} onChange={e => setCredFilter(e.target.value)} placeholder="Filter by status, type, staff..."
                className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <button onClick={() => setShowCredForm(!showCredForm)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="size-3.5" /> Add Credential
            </button>
          </div>

          {showCredForm && (
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <h4 className="text-xs font-semibold">New Credential</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Staff *</label>
                  <select value={credForm.staff_id} onChange={e => setCredForm(prev => ({ ...prev, staff_id: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Select staff</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Credential Type *</label>
                  <input value={credForm.credential_type} onChange={e => setCredForm(prev => ({ ...prev, credential_type: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Medical License" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Credential Name *</label>
                  <input value={credForm.credential_name} onChange={e => setCredForm(prev => ({ ...prev, credential_name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. RN License" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Issuing Authority</label>
                  <input value={credForm.issuing_authority} onChange={e => setCredForm(prev => ({ ...prev, issuing_authority: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Credential Number</label>
                  <input value={credForm.credential_number} onChange={e => setCredForm(prev => ({ ...prev, credential_number: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Expiry Date</label>
                  <input type="date" value={credForm.expiry_date} onChange={e => setCredForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleAddCredential} disabled={credSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {credSaving && <Loader2 className="size-3 animate-spin" />} Save Credential
                </button>
                <button onClick={() => setShowCredForm(false)}
                  className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filteredCredentials.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
                <Shield className="size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No credentials found</p>
              </div>
            ) : (
              filteredCredentials.map(cred => {
                const isExpiring = cred.expiry_date && new Date(cred.expiry_date) <= new Date(Date.now() + 30 * 86400000) && cred.status === "active";
                return (
                  <div key={cred.id} className="rounded-xl border bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{cred.credential_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {cred.users?.full_name || "Unknown"} · {cred.credential_type}
                          {cred.issuing_authority ? ` · ${cred.issuing_authority}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isExpiring && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                            <Clock className="size-3" /> Expiring
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${CREDENTIAL_STATUS_STYLES[cred.status] || "text-gray-600 bg-gray-50"}`}>
                          {cred.status}
                        </span>
                      </div>
                    </div>
                    {cred.expiry_date && (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Expires: {new Date(cred.expiry_date).toLocaleDateString("en-RW", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === "ipc" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">IPC Log Entries</h3>
            <button onClick={() => setShowIpcForm(!showIpcForm)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="size-3.5" /> Add Entry
            </button>
          </div>

          {showIpcForm && (
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <h4 className="text-xs font-semibold">New IPC Entry</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">IPC Type *</label>
                  <select value={ipcForm.ipc_type} onChange={e => setIpcForm(prev => ({ ...prev, ipc_type: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                    {IPC_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Area</label>
                  <input value={ipcForm.area} onChange={e => setIpcForm(prev => ({ ...prev, area: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Ward A" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Description</label>
                  <input value={ipcForm.description} onChange={e => setIpcForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleAddIPC} disabled={ipcSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {ipcSaving && <Loader2 className="size-3 animate-spin" />} Save Entry
                </button>
                <button onClick={() => setShowIpcForm(false)}
                  className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {ipcLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : ipcLogs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <ClipboardCheck className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No IPC log entries</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ipcLogs.map(log => (
                <div key={log.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{log.ipc_type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {log.area || "N/A"} · {log.users?.full_name || "Unknown"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {log.log_date ? new Date(log.log_date).toLocaleDateString("en-RW", { month: "short", day: "numeric" }) : "—"}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        log.status === "completed" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                  {log.description && <p className="mt-2 text-[10px] text-muted-foreground">{log.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "equipment" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Equipment Maintenance</h3>
            <button onClick={() => setShowEquipForm(!showEquipForm)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="size-3.5" /> Schedule Maintenance
            </button>
          </div>

          {showEquipForm && (
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <h4 className="text-xs font-semibold">New Maintenance Record</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Equipment Name *</label>
                  <input value={equipForm.equipment_name} onChange={e => setEquipForm(prev => ({ ...prev, equipment_name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">ID Tag</label>
                  <input value={equipForm.equipment_id_tag} onChange={e => setEquipForm(prev => ({ ...prev, equipment_id_tag: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Category</label>
                  <input value={equipForm.category} onChange={e => setEquipForm(prev => ({ ...prev, category: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Next Maintenance *</label>
                  <input type="date" value={equipForm.next_maintenance_date} onChange={e => setEquipForm(prev => ({ ...prev, next_maintenance_date: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Type</label>
                  <input value={equipForm.maintenance_type} onChange={e => setEquipForm(prev => ({ ...prev, maintenance_type: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Vendor</label>
                  <input value={equipForm.vendor} onChange={e => setEquipForm(prev => ({ ...prev, vendor: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleAddEquipment} disabled={equipSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {equipSaving && <Loader2 className="size-3 animate-spin" />} Save Record
                </button>
                <button onClick={() => setShowEquipForm(false)}
                  className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {equipLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : equipment.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <Wrench className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No equipment records</p>
            </div>
          ) : (
            <div className="space-y-2">
              {equipment.map(eq => {
                const isOverdue = eq.next_maintenance_date && new Date(eq.next_maintenance_date) < new Date();
                return (
                  <div key={eq.id} className={`rounded-xl border bg-white p-4 ${isOverdue ? "border-red-200" : ""}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{eq.equipment_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {eq.category || "N/A"}{eq.equipment_id_tag ? ` · ${eq.equipment_id_tag}` : ""}
                          {eq.vendor ? ` · ${eq.vendor}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                            <AlertTriangle className="size-3" /> Overdue
                          </span>
                        )}
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          eq.status === "completed" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                        }`}>
                          {eq.status}
                        </span>
                      </div>
                    </div>
                    {eq.next_maintenance_date && (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Next: {new Date(eq.next_maintenance_date).toLocaleDateString("en-RW", { month: "short", day: "numeric", year: "numeric" })}
                        {eq.maintenance_type ? ` · ${eq.maintenance_type}` : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "accreditation" && (
        <div className="space-y-4">
          {accredLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : accreditationByCategory.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <ClipboardCheck className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No accreditation items configured</p>
            </div>
          ) : (
            accreditationByCategory.map(([category, items]) => (
              <div key={category} className="rounded-xl border bg-white p-4 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">{category}</h4>
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.item_name || item.description}</p>
                      {item.notes && <p className="text-[10px] text-muted-foreground">{item.notes}</p>}
                    </div>
                    <button onClick={() => handleToggleAccreditation(item)}
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                        item.status === "met" ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" : "text-gray-600 bg-gray-50 hover:bg-gray-100"
                      }`}>
                      {item.status === "met" ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                      {item.status === "met" ? "Met" : "Not Met"}
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Compliance Reports</h3>
            <button onClick={() => setShowReportForm(!showReportForm)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="size-3.5" /> New Report
            </button>
          </div>

          {showReportForm && (
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <h4 className="text-xs font-semibold">Create Report</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Report Type</label>
                  <select value={reportForm.report_type} onChange={e => setReportForm(prev => ({ ...prev, report_type: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="incident">Incident</option>
                    <option value="ad_hoc">Ad Hoc</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Title *</label>
                  <input value={reportForm.title} onChange={e => setReportForm(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Description</label>
                  <input value={reportForm.description} onChange={e => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleAddReport} disabled={reportSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {reportSaving && <Loader2 className="size-3 animate-spin" />} Create Report
                </button>
                <button onClick={() => setShowReportForm(false)}
                  className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {reportsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <FileText className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No compliance reports</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map(report => (
                <div key={report.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{report.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {report.report_type} · {report.users?.full_name || "Unknown"}
                        {report.created_at ? ` · ${new Date(report.created_at).toLocaleDateString("en-RW", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${REPORT_STATUS_STYLES[report.status] || "text-gray-600 bg-gray-50"}`}>
                        {report.status}
                      </span>
                      {report.status === "draft" && (
                        <button onClick={() => handleSubmitReport(report.id)}
                          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors">
                          <Send className="size-3" /> Submit
                        </button>
                      )}
                    </div>
                  </div>
                  {report.description && <p className="mt-2 text-[10px] text-muted-foreground">{report.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

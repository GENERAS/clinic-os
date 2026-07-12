"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Loader2, Shield, FileText, ClipboardList, Plus, User, AlertCircle, CheckCircle2, Clock, XCircle, ChevronRight, ChevronDown, Trash2, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getInsuranceService, INSURANCE_PROVIDERS } from "@/features/insurance/services/insurance.service";
import { getBillingService } from "@/features/billing/services/billing.service";
import { PreAuthQueue } from "@/features/insurance/components/PreAuthQueue";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const STATUS_STYLES = {
  active: "text-emerald-600 bg-emerald-50",
  inactive: "text-gray-600 bg-gray-50",
  expired: "text-red-600 bg-red-50",
  pending: "text-amber-600 bg-amber-50",
};

const CLAIM_STATUS_STYLES = {
  draft: "text-gray-600 bg-gray-50",
  submitted: "text-blue-600 bg-blue-50",
  approved: "text-emerald-600 bg-emerald-50",
  partially_approved: "text-amber-600 bg-amber-50",
  rejected: "text-red-600 bg-red-50",
  paid: "text-emerald-700 bg-emerald-100",
};

const CLAIM_STATUSES = ["all", "draft", "submitted", "approved", "rejected", "paid"];

const TABS = [
  { id: "policies", label: "Policies", icon: FileText },
  { id: "preauth", label: "Pre-Auth Queue", icon: ClipboardList },
  { id: "plans", label: "Plans", icon: Shield },
  { id: "claims", label: "Claims", icon: DollarSign },
];

const FORMAT_CURRENCY = (amount) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(amount || 0);

function UsageBar({ used, limit }) {
  if (!limit || limit <= 0) return <span className="text-[10px] text-muted-foreground">No limit set</span>;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">{pct}% of {FORMAT_CURRENCY(limit)} used</p>
    </div>
  );
}

export default function InsurancePage() {
  const { clinic: authClinic, user } = useAuth();
  const clinicId = authClinic?.id;
  const service = useMemo(() => getInsuranceService(), []);
  const billing = useMemo(() => getBillingService(), []);
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState("policies");
  const [policies, setPolicies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [saving, setSaving] = useState(false);

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ provider: "", plan_name: "", annual_limit: "", pre_auth_required_above: "", coverage_type: "80" });

  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimStatusFilter, setClaimStatusFilter] = useState("all");
  const [expandedClaim, setExpandedClaim] = useState(null);
  const [showCreateClaim, setShowCreateClaim] = useState(false);
  const [claimForm, setClaimForm] = useState({ patient_id: "", invoice_id: "", provider: "", policy_number: "", total_amount: "", covered_amount: "", co_pay_amount: "", notes: "" });
  const [patientSearch, setPatientSearch] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [selectedClaimPatient, setSelectedClaimPatient] = useState(null);
  const [patientInvoices, setPatientInvoices] = useState([]);
  const [claimItems, setClaimItems] = useState({});

  const loadPolicies = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("patient_insurance")
        .select("*, patients(id, full_name, phone)")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPolicies(data || []);

      const { data: ptData } = await supabase
        .from("patients")
        .select("id, full_name")
        .eq("clinic_id", clinicId)
        .order("full_name");
      setPatients(ptData || []);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load insurance policies"));
    } finally {
      setLoading(false);
    }
  }, [clinicId, supabase]);

  const loadPlans = useCallback(async () => {
    if (!clinicId) return;
    try {
      const data = await service.getInsurancePlans(clinicId);
      setPlans(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load insurance plans"));
    }
  }, [clinicId, service]);

  const loadClaims = useCallback(async () => {
    if (!clinicId) return;
    setClaimsLoading(true);
    try {
      const data = await service.getClaims(clinicId);
      setClaims(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load claims"));
    } finally {
      setClaimsLoading(false);
    }
  }, [clinicId, service]);

  useEffect(() => { loadPolicies(); loadPlans(); }, [loadPolicies, loadPlans]);
  useEffect(() => { if (activeTab === "claims") loadClaims(); }, [activeTab, loadClaims]);

  const filteredPolicies = useMemo(() => {
    let result = policies;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        (p.patients?.full_name || "").toLowerCase().includes(q) ||
        (p.policy_number || "").toLowerCase().includes(q) ||
        (p.member_name || "").toLowerCase().includes(q)
      );
    }
    if (providerFilter) result = result.filter(p => p.provider === providerFilter);
    if (statusFilter) {
      const now = new Date();
      result = result.filter(p => {
        if (statusFilter === "expired") return p.valid_until && new Date(p.valid_until) < now;
        if (statusFilter === "active") return !p.valid_until || new Date(p.valid_until) >= now;
        return true;
      });
    }
    return result;
  }, [policies, search, providerFilter, statusFilter]);

  const filteredClaims = useMemo(() => {
    if (claimStatusFilter === "all") return claims;
    return claims.filter(c => c.status === claimStatusFilter);
  }, [claims, claimStatusFilter]);

  const handleSavePlan = useCallback(async () => {
    if (!clinicId || !planForm.provider || !planForm.plan_name) {
      toast.error("Provider and plan name are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        provider: planForm.provider,
        plan_name: planForm.plan_name,
        annual_limit: parseFloat(planForm.annual_limit) || 0,
        pre_auth_required_above: parseFloat(planForm.pre_auth_required_above) || 0,
        coverage_type: parseFloat(planForm.coverage_type) || 80,
      };
      if (editingPlan) {
        await service.updateInsurancePlan(clinicId, editingPlan.id, payload);
        toast.success("Plan updated");
      } else {
        await service.createInsurancePlan(clinicId, payload);
        toast.success("Plan created");
      }
      setShowPlanForm(false);
      setEditingPlan(null);
      setPlanForm({ provider: "", plan_name: "", annual_limit: "", pre_auth_required_above: "", coverage_type: "80" });
      loadPlans();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to save plan"));
    } finally {
      setSaving(false);
    }
  }, [clinicId, planForm, editingPlan, service, loadPlans]);

  const handleEditPlan = useCallback((plan) => {
    setEditingPlan(plan);
    setPlanForm({
      provider: plan.provider || "",
      plan_name: plan.plan_name || "",
      annual_limit: plan.annual_limit?.toString() || "",
      pre_auth_required_above: plan.pre_auth_required_above?.toString() || "",
      coverage_type: plan.coverage_type?.toString() || "80",
    });
    setShowPlanForm(true);
  }, []);

  const handleSearchPatients = useCallback(async (query) => {
    if (!clinicId || !query || query.trim().length < 2) {
      setPatientSearchResults([]);
      return;
    }
    try {
      const results = await supabase
        .from("patients")
        .select("id, full_name, phone, insurance_provider, insurance_policy_number")
        .eq("clinic_id", clinicId)
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);
      setPatientSearchResults(results.data || []);
    } catch { }
  }, [clinicId, supabase]);

  const handleSelectClaimPatient = useCallback(async (patient) => {
    setSelectedClaimPatient(patient);
    setClaimForm(prev => ({
      ...prev,
      patient_id: patient.id,
      provider: patient.insurance_provider || "",
      policy_number: patient.insurance_policy_number || "",
    }));
    setPatientSearch("");
    setPatientSearchResults([]);
    try {
      const invoices = await billing.getInvoices(clinicId, { patientId: patient.id });
      setPatientInvoices(invoices.filter(i => i.status !== "cancelled"));
    } catch {
      setPatientInvoices([]);
    }
  }, [clinicId, billing]);

  const handleSelectClaimInvoice = useCallback((invoiceId) => {
    const inv = patientInvoices.find(i => i.id === invoiceId);
    if (inv) {
      setClaimForm(prev => ({
        ...prev,
        invoice_id: invoiceId,
        total_amount: inv.total?.toString() || "",
      }));
    }
  }, [patientInvoices]);

  const handleCreateClaim = useCallback(async () => {
    if (!clinicId || !claimForm.patient_id || !claimForm.invoice_id) {
      toast.error("Patient and invoice are required");
      return;
    }
    setSaving(true);
    try {
      await service.createClaim(clinicId, {
        patient_id: claimForm.patient_id,
        invoice_id: claimForm.invoice_id,
        provider: claimForm.provider,
        policy_number: claimForm.policy_number,
        total_amount: parseFloat(claimForm.total_amount) || 0,
        covered_amount: parseFloat(claimForm.covered_amount) || 0,
        co_pay_amount: parseFloat(claimForm.co_pay_amount) || 0,
        notes: claimForm.notes,
      }, user?.id);
      toast.success("Claim created");
      setShowCreateClaim(false);
      setSelectedClaimPatient(null);
      setPatientInvoices([]);
      setClaimForm({ patient_id: "", invoice_id: "", provider: "", policy_number: "", total_amount: "", covered_amount: "", co_pay_amount: "", notes: "" });
      loadClaims();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to create claim"));
    } finally {
      setSaving(false);
    }
  }, [clinicId, claimForm, user, service, loadClaims]);

  const handleClaimStatusUpdate = useCallback(async (claimId, status, notes) => {
    setSaving(true);
    try {
      await service.updateClaimStatus(clinicId, claimId, status, { notes });
      toast.success(`Claim ${status}`);
      loadClaims();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to update claim"));
    } finally {
      setSaving(false);
    }
  }, [clinicId, service, loadClaims]);

  const toggleClaimExpand = useCallback(async (claimId) => {
    if (expandedClaim === claimId) {
      setExpandedClaim(null);
      return;
    }
    setExpandedClaim(claimId);
    if (!claimItems[claimId]) {
      try {
        const items = await service.getClaimItems(claimId);
        setClaimItems(prev => ({ ...prev, [claimId]: items }));
      } catch { }
    }
  }, [expandedClaim, claimItems, service]);

  if (loading && activeTab === "policies") {
    return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Insurance Management" description={`${policies.length} policies · ${plans.length} plans · ${claims.length} claims`} />

      <div className="flex items-center gap-1 rounded-xl border bg-white p-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors flex-1 justify-center ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}>
              <Icon className="size-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "policies" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, policy number..."
                className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Providers</option>
              {INSURANCE_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {filteredPolicies.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <Shield className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No insurance policies found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPolicies.map(policy => {
                const isExpired = policy.valid_until && new Date(policy.valid_until) < new Date();
                const statusKey = isExpired ? "expired" : "active";
                return (
                  <div key={policy.id} className="rounded-xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <User className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{policy.patients?.full_name || "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {policy.provider} · Policy: {policy.policy_number || "—"}
                            {policy.member_name ? ` · Member: ${policy.member_name}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[statusKey]}`}>
                        {statusKey === "active" ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                        {statusKey}
                      </span>
                    </div>
                    <div className="mt-3">
                      <UsageBar used={0} limit={policy.annual_limit} />
                    </div>
                    {policy.valid_from && policy.valid_until && (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Valid: {new Date(policy.valid_from).toLocaleDateString()} — {new Date(policy.valid_until).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "preauth" && (
        <div className="rounded-xl border bg-white p-6">
          <PreAuthQueue service={service} clinicId={clinicId} userId={user?.id} />
        </div>
      )}

      {activeTab === "plans" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Insurance Plans</h3>
            <button onClick={() => { setShowPlanForm(true); setEditingPlan(null); setPlanForm({ provider: "", plan_name: "", annual_limit: "", pre_auth_required_above: "", coverage_type: "80" }); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="size-3.5" /> Add Plan
            </button>
          </div>

          {showPlanForm && (
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <h4 className="text-xs font-semibold">{editingPlan ? "Edit Plan" : "New Plan"}</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Provider *</label>
                  <select value={planForm.provider} onChange={e => setPlanForm(prev => ({ ...prev, provider: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Select provider</option>
                    {INSURANCE_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Plan Name *</label>
                  <input value={planForm.plan_name} onChange={e => setPlanForm(prev => ({ ...prev, plan_name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Gold Plus" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Annual Limit (RWF)</label>
                  <input type="number" value={planForm.annual_limit} onChange={e => setPlanForm(prev => ({ ...prev, annual_limit: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Pre-Auth Threshold (RWF)</label>
                  <input type="number" value={planForm.pre_auth_required_above} onChange={e => setPlanForm(prev => ({ ...prev, pre_auth_required_above: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Coverage %</label>
                  <input type="number" min="0" max="100" value={planForm.coverage_type} onChange={e => setPlanForm(prev => ({ ...prev, coverage_type: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Description</label>
                  <input value={planForm.description} onChange={e => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" placeholder="Optional" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleSavePlan} disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving && <Loader2 className="size-3 animate-spin" />}
                  {editingPlan ? "Update Plan" : "Create Plan"}
                </button>
                <button onClick={() => { setShowPlanForm(false); setEditingPlan(null); }}
                  className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {plans.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <Shield className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No insurance plans configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map(plan => (
                <div key={plan.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{plan.plan_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {plan.provider} · Coverage: {plan.coverage_type || 80}%
                        {plan.annual_limit > 0 ? ` · Cap: ${FORMAT_CURRENCY(plan.annual_limit)}` : ""}
                      </p>
                      {plan.description && <p className="text-[10px] text-muted-foreground mt-1">{plan.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${plan.is_active ? "text-emerald-600 bg-emerald-50" : "text-gray-600 bg-gray-50"}`}>
                        {plan.is_active ? "Active" : "Inactive"}
                      </span>
                      <button onClick={() => handleEditPlan(plan)}
                        className="rounded-lg border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                        Edit
                      </button>
                    </div>
                  </div>
                  {plan.pre_auth_required_above > 0 && (
                    <p className="mt-2 text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
                      Pre-auth required for claims ≥ {FORMAT_CURRENCY(plan.pre_auth_required_above)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "claims" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 rounded-lg border p-0.5">
              {CLAIM_STATUSES.map(s => (
                <button key={s} onClick={() => setClaimStatusFilter(s)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors capitalize ${
                    claimStatusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {s === "all" ? `All (${claims.length})` : s.replace("_", " ")}
                </button>
              ))}
            </div>
            <button onClick={() => { setShowCreateClaim(true); setSelectedClaimPatient(null); setPatientInvoices([]); setClaimForm({ patient_id: "", invoice_id: "", provider: "", policy_number: "", total_amount: "", covered_amount: "", co_pay_amount: "", notes: "" }); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="size-3.5" /> Create Claim
            </button>
          </div>

          {showCreateClaim && (
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <h4 className="text-xs font-semibold">New Insurance Claim</h4>

              {!selectedClaimPatient ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Select Patient *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={patientSearch} onChange={e => { setPatientSearch(e.target.value); handleSearchPatients(e.target.value); }}
                      placeholder="Search patient name or phone..."
                      className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  {patientSearchResults.length > 0 && (
                    <div className="rounded-lg border bg-white max-h-40 overflow-y-auto">
                      {patientSearchResults.map(p => (
                        <button key={p.id} onClick={() => handleSelectClaimPatient(p)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/30 transition-colors border-b last:border-0">
                          <div>
                            <p className="text-xs font-medium">{p.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.phone || "No phone"}</p>
                          </div>
                          {p.insurance_provider && (
                            <span className="text-[10px] text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">{p.insurance_provider}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold">{selectedClaimPatient.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedClaimPatient.phone}</p>
                    </div>
                    <button onClick={() => { setSelectedClaimPatient(null); setPatientInvoices([]); }} className="text-[10px] text-primary hover:underline">Change</button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground uppercase">Select Invoice *</label>
                      <select value={claimForm.invoice_id} onChange={e => handleSelectClaimInvoice(e.target.value)}
                        className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="">Select invoice</option>
                        {patientInvoices.map(inv => (
                          <option key={inv.id} value={inv.id}>{inv.invoice_number} — {FORMAT_CURRENCY(inv.total)} ({inv.status})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground uppercase">Provider *</label>
                      <select value={claimForm.provider} onChange={e => setClaimForm(prev => ({ ...prev, provider: e.target.value }))}
                        className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="">Select provider</option>
                        {INSURANCE_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground uppercase">Policy Number</label>
                      <input value={claimForm.policy_number} onChange={e => setClaimForm(prev => ({ ...prev, policy_number: e.target.value }))}
                        className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" placeholder="Auto-filled" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground uppercase">Total Amount (RWF)</label>
                      <input type="number" value={claimForm.total_amount} onChange={e => setClaimForm(prev => ({ ...prev, total_amount: e.target.value }))}
                        className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground uppercase">Covered Amount (RWF)</label>
                      <input type="number" value={claimForm.covered_amount} onChange={e => setClaimForm(prev => ({ ...prev, covered_amount: e.target.value }))}
                        className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground uppercase">Co-pay Amount (RWF)</label>
                      <input type="number" value={claimForm.co_pay_amount} onChange={e => setClaimForm(prev => ({ ...prev, co_pay_amount: e.target.value }))}
                        className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Notes</label>
                    <input value={claimForm.notes} onChange={e => setClaimForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" placeholder="Optional notes" />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={handleCreateClaim} disabled={saving || !claimForm.patient_id || !claimForm.invoice_id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                      {saving && <Loader2 className="size-3 animate-spin" />}
                      Create Claim
                    </button>
                    <button onClick={() => { setShowCreateClaim(false); setSelectedClaimPatient(null); }}
                      className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {claimsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
          ) : filteredClaims.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <DollarSign className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No claims found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClaims.map(claim => (
                <div key={claim.id} className="rounded-xl border bg-white">
                  <div className="p-4 cursor-pointer" onClick={() => toggleClaimExpand(claim.id)}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <DollarSign className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{claim.claim_number || `CLM-${claim.id.slice(0, 8).toUpperCase()}`}</p>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${CLAIM_STATUS_STYLES[claim.status]}`}>
                              {claim.status?.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {claim.patients?.full_name || "Unknown"} · {claim.provider} · {new Date(claim.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-semibold">{FORMAT_CURRENCY(claim.total_amount)}</p>
                          <p className="text-[10px] text-muted-foreground">Covered: {FORMAT_CURRENCY(claim.covered_amount)}</p>
                        </div>
                        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${expandedClaim === claim.id ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </div>

                  {expandedClaim === claim.id && (
                    <div className="border-t px-4 py-3 space-y-3 bg-muted/10">
                      {claimItems[claim.id] && claimItems[claim.id].length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Line Items</p>
                          <div className="space-y-1">
                            {claimItems[claim.id].map(item => (
                              <div key={item.id} className="flex items-center justify-between text-xs rounded-lg bg-white px-3 py-2 border">
                                <div>
                                  <p className="font-medium">{item.description}</p>
                                  {item.icd_code && <p className="text-[10px] text-muted-foreground">ICD: {item.icd_code}</p>}
                                </div>
                                <span className="font-semibold">{FORMAT_CURRENCY(item.covered_amount || item.total || 0)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {claim.notes && (
                        <p className="text-xs text-muted-foreground"><span className="font-medium">Notes:</span> {claim.notes}</p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {claim.status === "draft" && (
                          <button onClick={(e) => { e.stopPropagation(); handleClaimStatusUpdate(claim.id, "submitted"); }}
                            disabled={saving}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                            Submit
                          </button>
                        )}
                        {claim.status === "submitted" && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleClaimStatusUpdate(claim.id, "approved"); }}
                              disabled={saving}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                              Approve
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleClaimStatusUpdate(claim.id, "rejected"); }}
                              disabled={saving}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-red-700 disabled:opacity-50">
                              Reject
                            </button>
                          </>
                        )}
                        {claim.status === "approved" && (
                          <button onClick={(e) => { e.stopPropagation(); handleClaimStatusUpdate(claim.id, "paid"); }}
                            disabled={saving}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

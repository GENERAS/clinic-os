"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Shield, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";
import { INSURANCE_PROVIDERS } from "@/features/insurance/services/insurance.service";

const COVERAGE_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "family", label: "Family" },
  { value: "group", label: "Group" },
];

const INITIAL_FORM = {
  provider: "",
  policy_number: "",
  member_name: "",
  coverage_type: "individual",
  annual_limit: "",
  valid_from: "",
  valid_until: "",
  is_primary: false,
};

export function InsuranceManager({ service, clinicId, patientId, onUpdate }) {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clinicId || !patientId || !service) return;
    setLoading(true);
    try {
      const data = await service.getPatientInsurance(clinicId, patientId);
      setPolicies(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load insurance policies"));
    } finally {
      setLoading(false);
    }
  }, [clinicId, patientId, service]);

  useEffect(() => { load(); }, [load]);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setShowForm(false);
  }, []);

  const startEdit = useCallback((policy) => {
    setForm({
      provider: policy.provider || "",
      policy_number: policy.policy_number || "",
      member_name: policy.member_name || "",
      coverage_type: policy.coverage_type || "individual",
      annual_limit: policy.annual_limit || "",
      valid_from: policy.valid_from ? policy.valid_from.substring(0, 10) : "",
      valid_until: policy.valid_until ? policy.valid_until.substring(0, 10) : "",
      is_primary: policy.is_primary || false,
    });
    setEditingId(policy.id);
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.provider || !form.policy_number) {
      toast.error("Provider and policy number are required");
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        annual_limit: parseFloat(form.annual_limit) || 0,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
      };
      if (editingId) {
        await service.updatePatientInsurance(clinicId, editingId, data);
        toast.success("Policy updated");
      } else {
        await service.addPatientInsurance(clinicId, patientId, data);
        toast.success("Policy added");
      }
      resetForm();
      load();
      onUpdate?.();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to save policy"));
    } finally {
      setSaving(false);
    }
  }, [form, editingId, clinicId, patientId, service, load, resetForm, onUpdate]);

  const handleRemove = useCallback(async (insuranceId) => {
    if (!confirm("Remove this insurance policy?")) return;
    setSaving(true);
    try {
      await service.removePatientInsurance(clinicId, insuranceId);
      toast.success("Policy removed");
      load();
      onUpdate?.();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to remove policy"));
    } finally {
      setSaving(false);
    }
  }, [service, clinicId, load, onUpdate]);

  const getUsagePercent = (policy) => {
    if (!policy.annual_limit || policy.annual_limit <= 0) return 0;
    return Math.min(100, Math.round(((policy.used_amount || 0) / policy.annual_limit) * 100));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Shield className="size-4 text-blue-500" /> Insurance Policies
        </h3>
        <button
          onClick={() => showForm ? resetForm() : setShowForm(true)}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3" /> {showForm ? "Cancel" : "Add Policy"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.provider}
              onChange={(e) => setForm(prev => ({ ...prev, provider: e.target.value }))}
              className="rounded-lg border bg-white px-2 py-1.5 text-xs outline-none"
            >
              <option value="">Select provider...</option>
              {INSURANCE_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <input
              value={form.policy_number}
              onChange={(e) => setForm(prev => ({ ...prev, policy_number: e.target.value }))}
              placeholder="Policy number"
              className="rounded-lg border bg-white px-2 py-1.5 text-xs outline-none"
            />
            <input
              value={form.member_name}
              onChange={(e) => setForm(prev => ({ ...prev, member_name: e.target.value }))}
              placeholder="Member name"
              className="rounded-lg border bg-white px-2 py-1.5 text-xs outline-none"
            />
            <select
              value={form.coverage_type}
              onChange={(e) => setForm(prev => ({ ...prev, coverage_type: e.target.value }))}
              className="rounded-lg border bg-white px-2 py-1.5 text-xs outline-none"
            >
              {COVERAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              type="number"
              value={form.annual_limit}
              onChange={(e) => setForm(prev => ({ ...prev, annual_limit: e.target.value }))}
              placeholder="Annual limit (RWF)"
              min="0"
              className="rounded-lg border bg-white px-2 py-1.5 text-xs outline-none"
            />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={form.valid_from}
                onChange={(e) => setForm(prev => ({ ...prev, valid_from: e.target.value }))}
                className="rounded-lg border bg-white px-2 py-1.5 text-xs outline-none flex-1"
              />
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm(prev => ({ ...prev, valid_until: e.target.value }))}
                className="rounded-lg border bg-white px-2 py-1.5 text-xs outline-none flex-1"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={(e) => setForm(prev => ({ ...prev, is_primary: e.target.checked }))}
              className="rounded"
            />
            Primary insurance
          </label>
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="size-3 animate-spin" />}
              {editingId ? "Update" : "Add"} Policy
            </button>
          </div>
        </div>
      )}

      {policies.length === 0 ? (
        <div className="rounded-xl border bg-white p-4 text-center">
          <AlertCircle className="size-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No insurance policies on record</p>
        </div>
      ) : (
        <div className="space-y-2">
          {policies.map(policy => {
            const usagePercent = getUsagePercent(policy);
            const providerInfo = INSURANCE_PROVIDERS.find(p => p.value === policy.provider);
            return (
              <div key={policy.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{providerInfo?.label || policy.provider}</p>
                      {policy.is_primary && (
                        <span className="rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 text-[10px] font-semibold">Primary</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Policy: {policy.policy_number}</p>
                    {policy.member_name && (
                      <p className="text-[10px] text-muted-foreground">Member: {policy.member_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => startEdit(policy)}
                      className="p-1 text-muted-foreground hover:text-primary"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(policy.id)}
                      disabled={saving}
                      className="p-1 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {policy.annual_limit > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Annual limit usage</span>
                      <span>{usagePercent}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="rounded-full bg-muted/50 px-2 py-0.5">{policy.coverage_type}</span>
                  {policy.valid_from && (
                    <span>Valid: {new Date(policy.valid_from).toLocaleDateString()} — {policy.valid_until ? new Date(policy.valid_until).toLocaleDateString() : "Open"}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

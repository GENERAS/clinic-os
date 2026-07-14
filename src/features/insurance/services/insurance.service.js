import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export const INSURANCE_PROVIDERS = [
  { value: "RSSB_RAMA", label: "RSSB RAMA" },
  { value: "MMI", label: "MMI" },
  { value: "Sanlam", label: "Sanlam" },
  { value: "Radiant", label: "Radiant" },
  { value: "Santam", label: "Santam" },
  { value: "Prime Insurance", label: "Prime Insurance" },
  { value: "Other", label: "Other" },
];

export const INSURANCE_SPLITS = {
  CBHI: { patient: 20, insurer: 80, label: "CBHI (20/80)" },
  RSSB_RAMA: { patient: 15, insurer: 85, label: "RSSB RAMA (15/85)" },
  MMI: { patient: 10, insurer: 90, label: "MMI (10/90)" },
  Radiant: { patient: 15, insurer: 85, label: "Radiant (15/85)" },
  Sanlam: { patient: 20, insurer: 80, label: "Sanlam (20/80)" },
  Britam: { patient: 20, insurer: 80, label: "Britam (20/80)" },
};

export const TAX_CLASSES = {
  A: { label: "Class A — 18% VAT", rate: 18 },
  B: { label: "Class B — 0% Essential", rate: 0 },
  C: { label: "Class C — Exempt Medical", rate: 0 },
  D: { label: "Class D — Fully Exempt", rate: 0 },
};

export class InsuranceService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async getPatientInsurance(clinicId, patientId) {
    const { data, error } = await this.supabase
      .from("patient_insurance")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async addPatientInsurance(clinicId, patientId, data) {
    const { data: record, error } = await this.supabase
      .from("patient_insurance")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        provider: data.provider,
        policy_number: data.policy_number,
        member_name: data.member_name || null,
        coverage_type: data.coverage_type || "basic",
        annual_limit: data.annual_limit || 0,
        valid_from: data.valid_from || null,
        valid_until: data.valid_until || null,
        is_primary: data.is_primary || false,
      })
      .select("id")
      .single();
    if (error) throw error;
    return record.id;
  }

  async updatePatientInsurance(clinicId, insuranceId, data) {
    const { error } = await this.supabase
      .from("patient_insurance")
      .update(data)
      .eq("id", insuranceId)
      .eq("clinic_id", clinicId);
    if (error) throw error;
  }

  async removePatientInsurance(clinicId, insuranceId) {
    const { error } = await this.supabase
      .from("patient_insurance")
      .delete()
      .eq("id", insuranceId)
      .eq("clinic_id", clinicId);
    if (error) throw error;
  }

  async getInsurancePlans(clinicId) {
    const { data, error } = await this.supabase
      .from("insurance_plans")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("plan_name");
    if (error) throw error;
    return data || [];
  }

  async createInsurancePlan(clinicId, data) {
    const { data: plan, error } = await this.supabase
      .from("insurance_plans")
      .insert({
        clinic_id: clinicId,
        provider: data.provider,
        plan_name: data.plan_name,
        coverage_type: data.coverage_type,
        annual_limit: data.annual_limit || 0,
        pre_auth_required_above: data.pre_auth_required_above || 0,
        copay_percentage: data.copay_percentage || 0,
        is_active: data.is_active !== false,
      })
      .select("id")
      .single();
    if (error) throw error;
    return plan.id;
  }

  async updateInsurancePlan(clinicId, planId, data) {
    const { error } = await this.supabase
      .from("insurance_plans")
      .update(data)
      .eq("id", planId)
      .eq("clinic_id", clinicId);
    if (error) throw error;
  }

  async getPreAuthorizations(clinicId, status = null) {
    let query = this.supabase
      .from("insurance_pre_authorizations")
      .select(`
        *,
        patients(id, full_name, phone),
        patient_insurance(id, provider, policy_number)
      `)
      .eq("clinic_id", clinicId);
    if (status) query = query.eq("status", status);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createPreAuthorization(clinicId, data, userId) {
    const { data: auth, error } = await this.supabase
      .from("insurance_pre_authorizations")
      .insert({
        clinic_id: clinicId,
        patient_id: data.patient_id,
        insurance_id: data.insurance_id,
        consultation_id: data.consultation_id || null,
        provider: data.provider || "Unknown",
        procedure_description: data.procedure_description,
        estimated_cost: data.estimated_cost,
        status: "pending",
        created_by: userId,
        notes: data.notes || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return auth.id;
  }

  async updatePreAuthorizationStatus(clinicId, authId, status, notes = null, data = {}) {
    const updateData = { status, notes };
    if (status === "approved" || status === "rejected") {
      updateData.responded_at = new Date().toISOString();
    }
    if (status === "approved") {
      updateData.auth_token = data.auth_token || null;
    }

    const { error } = await this.supabase
      .from("insurance_pre_authorizations")
      .update(updateData)
      .eq("id", authId)
      .eq("clinic_id", clinicId);
    if (error) throw error;
  }

  async checkPreAuthRequired(clinicId, insuranceId, estimatedCost) {
    const { data: insurance, error: insErr } = await this.supabase
      .from("patient_insurance")
      .select("id, provider")
      .eq("id", insuranceId)
      .eq("clinic_id", clinicId)
      .single();
    if (insErr) throw insErr;

    const { data: plan, error: planErr } = await this.supabase
      .from("insurance_plans")
      .select("pre_auth_required_above")
      .eq("clinic_id", clinicId)
      .eq("provider", insurance.provider)
      .eq("is_active", true)
      .maybeSingle();
    if (planErr) throw planErr;

    const threshold = plan?.pre_auth_required_above || 0;
    return {
      required: threshold > 0 && estimatedCost >= threshold,
      threshold,
    };
  }

  async checkAnnualCap(clinicId, insuranceId, amount) {
    const { data: insurance, error: insErr } = await this.supabase
      .from("patient_insurance")
      .select("id, annual_limit, patient_id, provider")
      .eq("id", insuranceId)
      .eq("clinic_id", clinicId)
      .single();
    if (insErr) throw insErr;

    if (!insurance.annual_limit || insurance.annual_limit <= 0) {
      return { within_cap: true, annual_limit: insurance.annual_limit, used: 0, remaining: insurance.annual_limit };
    }

    const yearStart = `${new Date().getFullYear()}-01-01`;
    const { data: claims, error: claimErr } = await this.supabase
      .from("insurance_claims")
      .select("covered_amount")
      .eq("clinic_id", clinicId)
      .eq("patient_id", insurance.patient_id)
      .eq("provider", insurance.provider)
      .in("status", ["approved", "paid"])
      .gte("created_at", yearStart);
    if (claimErr) throw claimErr;

    const used = (claims || []).reduce((s, c) => s + parseFloat(c.covered_amount || 0), 0);
    const remaining = insurance.annual_limit - used;

    return {
      within_cap: amount <= remaining,
      annual_limit: insurance.annual_limit,
      used,
      remaining,
    };
  }

  async getClaimItems(claimId) {
    const { data, error } = await this.supabase
      .from("insurance_claim_items")
      .select("*")
      .eq("claim_id", claimId)
      .order("created_at");
    if (error) throw error;
    return data || [];
  }

  async createClaimItem(claimId, data) {
    const { data: item, error } = await this.supabase
      .from("insurance_claim_items")
      .insert({
        claim_id: claimId,
        billing_line_item_id: data.billing_line_item_id || null,
        description: data.description,
        icd_code: data.icd_code || null,
        cpt_code: data.cpt_code || null,
        quantity: data.quantity || 1,
        unit_price: data.unit_price || 0,
        covered_amount: data.covered_amount || 0,
      })
      .select("id")
      .single();
    if (error) throw error;
    return item.id;
  }

  async validateClaimCoding(clinicId, consultationId) {
    const { data: diagData, error: diagErr } = await this.supabase
      .from("diagnoses")
      .select("icd_code, description")
      .eq("consultation_id", consultationId);

    const { data: billingData, error: billErr } = await this.supabase
      .from("billing_line_items")
      .select("id, description, total, billing_invoices!inner(consultation_id)")
      .eq("billing_invoices.consultation_id", consultationId);

    const diagnoses = diagData || [];
    const billingItems = billingData || [];

    const warnings = [];
    const errors = [];

    if (diagnoses.length === 0 && billingItems.length > 0) {
      warnings.push({ type: "no_diagnosis", message: "No diagnosis codes recorded for this consultation" });
    }
    if (diagnoses.length > 0 && billingItems.length === 0) {
      warnings.push({ type: "no_billing", message: "Diagnosis recorded but no billing items" });
    }

    if (diagnoses.length > 0 && billingItems.length > 0) {
      const icdPrefix = (diagnoses[0]?.icd_code || "").substring(0, 2);
      if (!icdPrefix) {
        warnings.push({
          type: "no_icd_code",
          message: "Diagnosis has no ICD code prefix for cross-check",
          suggestion: "Ensure ICD codes are properly assigned",
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings, diagnoses, billingItems };
  }

  async submitClaim(clinicId, claimId) {
    const { error } = await this.supabase
      .from("insurance_claims")
      .update({
        status: "submitted",
        submission_date: new Date().toISOString(),
      })
      .eq("id", claimId)
      .eq("clinic_id", clinicId);
    if (error) throw error;
  }

  async updateClaimStatus(clinicId, claimId, status, data = {}) {
    const updateData = { status };
    if (data.notes) updateData.notes = data.notes;
    if (status === "approved") updateData.approval_date = new Date().toISOString();
    if (status === "rejected") updateData.rejection_reason = data.notes || null;

    const { error } = await this.supabase
      .from("insurance_claims")
      .update(updateData)
      .eq("id", claimId)
      .eq("clinic_id", clinicId);
    if (error) throw error;
  }

  async getClaims(clinicId, filters = {}) {
    let query = this.supabase
      .from("insurance_claims")
      .select(`
        *,
        patients(id, full_name, phone),
        billing_invoices(id, invoice_number, total)
      `)
      .eq("clinic_id", clinicId);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.patientId) query = query.eq("patient_id", filters.patientId);
    if (filters.provider) query = query.eq("provider", filters.provider);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createClaim(clinicId, data, userId) {
    const { data: claim, error } = await this.supabase
      .from("insurance_claims")
      .insert({
        clinic_id: clinicId,
        patient_id: data.patient_id,
        invoice_id: data.invoice_id,
        provider: data.provider,
        policy_number: data.policy_number || null,
        total_amount: parseFloat(data.total_amount) || 0,
        covered_amount: parseFloat(data.covered_amount) || 0,
        co_pay_amount: parseFloat(data.co_pay_amount) || 0,
        status: "draft",
        notes: data.notes || null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return claim.id;
  }

  async getInsuranceDashboard(clinicId) {
    const { data: claims, error: claimsErr } = await this.supabase
      .from("insurance_claims")
      .select("status, total_amount, covered_amount")
      .eq("clinic_id", clinicId);
    if (claimsErr) throw claimsErr;

    const { data: preAuths, error: preErr } = await this.supabase
      .from("insurance_pre_authorizations")
      .select("status, estimated_cost")
      .eq("clinic_id", clinicId);
    if (preErr) throw preErr;

    const allClaims = claims || [];
    const allPreAuths = preAuths || [];

    const claimsByStatus = {};
    allClaims.forEach(c => {
      claimsByStatus[c.status] = (claimsByStatus[c.status] || 0) + 1;
    });

    const preAuthsByStatus = {};
    allPreAuths.forEach(p => {
      preAuthsByStatus[p.status] = (preAuthsByStatus[p.status] || 0) + 1;
    });

    return {
      total_claims: allClaims.length,
      claims_by_status: claimsByStatus,
      total_billed: allClaims.reduce((s, c) => s + parseFloat(c.total_amount || 0), 0),
      total_covered: allClaims.reduce((s, c) => s + parseFloat(c.covered_amount || 0), 0),
      pending_pre_auths: allPreAuths.filter(p => p.status === "pending").length,
      total_pre_auths: allPreAuths.length,
      pre_auths_by_status: preAuthsByStatus,
      pending_pre_auth_cost: allPreAuths
        .filter(p => p.status === "pending")
        .reduce((s, p) => s + parseFloat(p.estimated_cost || 0), 0),
    };
  }
}

export function getInsuranceService() {
  if (cachedService) return cachedService;
  const supabase = createClient();
  cachedService = new InsuranceService(supabase);
  return cachedService;
}

import { createClient } from "@/lib/supabase/client";
import { getAuditService } from "@/services/database/audit.service";
import { getSubscriptionService } from "./subscription.service";

export function getPaymentService() {
  const supabase = createClient();
  const audit = getAuditService();
  const subscriptions = getSubscriptionService();

  return {
    async getPaymentMethods() {
      const { data } = await supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },

    async getPaymentInstructions(methodSlug) {
      const { data } = await supabase.from("payment_methods").select("instructions, name").eq("slug", methodSlug).maybeSingle();
      return data || null;
    },

    async submitPayment(clinicId, subscriptionId, values, userId) {
      const { data, error } = await supabase.from("payments").insert({
        clinic_id: clinicId,
        subscription_id: subscriptionId,
        amount: values.amount,
        currency: "RWF",
        payment_method: values.payment_method,
        transaction_reference: values.transaction_reference,
        payer_name: values.payer_name,
        payer_phone: values.payer_phone,
        proof_url: values.proof_url || null,
        status: "pending",
      }).select().single();
      if (error) throw error;

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "Payment Submitted",
        entity_type: "payments",
        entity_id: data.id,
        new_value: { amount: values.amount, method: values.payment_method },
      }).catch(() => {});

      return data;
    },

    async getPendingPayments(page = 0, pageSize = 20) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, count } = await supabase
        .from("payments")
        .select("*, clinics!inner(name)", { count: "exact" })
        .eq("status", "pending")
        .order("submitted_at", { ascending: false })
        .range(from, to);
      return { data: data || [], total: count || 0 };
    },

    async getAllPayments(page = 0, pageSize = 50) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, count } = await supabase
        .from("payments")
        .select("*, clinics!inner(name)", { count: "exact" })
        .order("submitted_at", { ascending: false })
        .range(from, to);
      return { data: data || [], total: count || 0 };
    },

    async verifyPayment(paymentId, verifiedBy) {
      const { error } = await supabase.rpc("verify_payment", {
        p_payment_id: paymentId,
        p_verified_by: verifiedBy,
      });
      if (error) throw error;

      audit.log({
        clinic_id: null,
        user_id: verifiedBy,
        action: "Payment Approved",
        entity_type: "payments",
        entity_id: paymentId,
      }).catch(() => {});

      return { success: true };
    },

    async rejectPayment(paymentId, verifiedBy, reason) {
      const { error } = await supabase.rpc("reject_payment", {
        p_payment_id: paymentId,
        p_verified_by: verifiedBy,
        p_reason: reason || null,
      });
      if (error) throw error;

      audit.log({
        clinic_id: null,
        user_id: verifiedBy,
        action: "Payment Rejected",
        entity_type: "payments",
        entity_id: paymentId,
        new_value: { reason },
      }).catch(() => {});

      return { success: true };
    },

    async getRevenueStats() {
      const today = new Date().toISOString().split("T")[0];
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();

      const [todayRes, monthRes, yearRes, allRes, subRes, clinicRes] = await Promise.all([
        supabase.from("payments").select("amount").eq("status", "verified").gte("verified_at", today),
        supabase.from("payments").select("amount").eq("status", "verified").gte("verified_at", startOfMonth),
        supabase.from("payments").select("amount").eq("status", "verified").gte("verified_at", startOfYear),
        supabase.from("payments").select("amount, payment_method").eq("status", "verified"),
        supabase.from("subscriptions").select("id, status, plan_id"),
        supabase.from("clinics").select("id"),
      ]);

      const allPayments = allRes.data || [];
      const totalRevenue = allPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

      const methodBreakdown = {};
      allPayments.forEach((p) => {
        const method = p.payment_method || "unknown";
        methodBreakdown[method] = (methodBreakdown[method] || 0) + Number(p.amount || 0);
      });

      const subs = subRes.data || [];
      const activeSubs = subs.filter((s) => s.status === "active").length;
      const trialSubs = subs.filter((s) => s.status === "trialing").length;
      const expiredSubs = subs.filter((s) => s.status === "expired" || s.status === "canceled").length;
      const totalClinics = clinicRes.data?.length || 1;

      return {
        revenueToday: todayRes.data?.reduce((s, p) => s + Number(p.amount || 0), 0) || 0,
        revenueThisMonth: monthRes.data?.reduce((s, p) => s + Number(p.amount || 0), 0) || 0,
        revenueThisYear: yearRes.data?.reduce((s, p) => s + Number(p.amount || 0), 0) || 0,
        totalRevenue,
        avgRevenuePerClinic: totalRevenue / totalClinics,
        activeSubs,
        trialSubs,
        expiredSubs,
        methodBreakdown,
        trialConversionRate: totalClinics > 0 ? Math.round(((activeSubs) / totalClinics) * 100) : 0,
        renewalRate: totalClinics > 0 ? Math.round(((activeSubs) / (activeSubs + expiredSubs)) * 100) : 0,
        churnRate: totalClinics > 0 ? Math.round(((expiredSubs) / totalClinics) * 100) : 0,
      };
    },
  };
}

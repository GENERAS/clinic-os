import { createClient } from "@/lib/supabase/client";

export function getSubscriptionService() {
  const supabase = createClient();

  function formatRWF(amount) {
    return new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(amount);
  }

  return {
    formatRWF,

    async getAllPlans() {
      const { data } = await supabase.from("plans").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },

    async getPlansMap() {
      const plans = await this.getAllPlans();
      return Object.fromEntries(plans.map((p) => [p.id, p]));
    },

    async getSubscription(clinicId) {
      const { data } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
    },

    async getUsage(clinicId) {
      const [staffRes, patientsRes, apptsRes, whatsRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact" }).eq("clinic_id", clinicId).eq("status", "active"),
        supabase.from("patients").select("id", { count: "exact" }).eq("clinic_id", clinicId),
        supabase.from("appointments").select("id", { count: "exact" }).eq("clinic_id", clinicId),
        supabase.from("whatsapp_messages").select("id", { count: "exact" }).eq("clinic_id", clinicId),
      ]);
      return {
        staff: staffRes.count || 0,
        patients: patientsRes.count || 0,
        appointments: apptsRes.count || 0,
        whatsapp_messages: whatsRes.count || 0,
      };
    },

    async changePlan(clinicId, newPlanId) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!sub) throw new Error("No subscription found");
      const { error } = await supabase.from("subscriptions").update({ plan_id: newPlanId, updated_at: new Date().toISOString() }).eq("id", sub.id);
      if (error) throw error;
      return { success: true };
    },

    async renewSubscription(clinicId, planId, billingCycle = "monthly", amount) {
      const now = new Date();
      const periodEnd = billingCycle === "yearly"
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const graceEnd = new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase.from("subscriptions").update({
          status: "pending_payment",
          plan_id: planId,
          billing_cycle: billingCycle,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          grace_period_ends_at: graceEnd.toISOString(),
          renewal_date: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("subscriptions").insert({
          clinic_id: clinicId,
          plan_id: planId,
          status: "pending_payment",
          billing_cycle: billingCycle,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          grace_period_ends_at: graceEnd.toISOString(),
          renewal_date: periodEnd.toISOString(),
        });
      }
      return { success: true };
    },

    async getDaysRemaining(subscription) {
      if (!subscription?.current_period_end) return 0;
      const now = new Date();
      const end = new Date(subscription.current_period_end);
      return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    },

    async getBillingHistory(clinicId) {
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("issued_at", { ascending: false })
        .limit(50);
      return data || [];
    },

    async getPendingPayments(clinicId) {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("status", "pending")
        .order("submitted_at", { ascending: false });
      return data || [];
    },
  };
}

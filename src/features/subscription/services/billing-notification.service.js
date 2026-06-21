import { createClient } from "@/lib/supabase/client";
import { getAuditService } from "@/services/database/audit.service";

const REMINDER_DAYS = [14, 7, 3, 1];

export function getBillingNotificationService() {
  const supabase = createClient();
  const audit = getAuditService();

  return {
    async checkAndNotify() {
      const now = new Date().toISOString();
      const fourteenDays = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("id, clinic_id, status, current_period_end, grace_period_ends_at, trial_ends_at, plan_id")
        .in("status", ["active", "trialing"])
        .lte("current_period_end", fourteenDays);

      const results = [];
      for (const sub of subs || []) {
        const daysLeft = Math.ceil((new Date(sub.current_period_end) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) continue;

        if (REMINDER_DAYS.includes(daysLeft)) {
          await this.createReminderNotification(sub.clinic_id, daysLeft);
          results.push({ clinicId: sub.clinic_id, daysLeft, type: "reminder" });
        }
      }

      return results;
    },

    async createReminderNotification(clinicId, daysLeft) {
      const title = daysLeft <= 0
        ? "Subscription Expired"
        : daysLeft === 1
          ? "Subscription Expires Tomorrow"
          : `Subscription Expires in ${daysLeft} Days`;

      const message = daysLeft <= 0
        ? "Your ClinicOS subscription has expired. Renew now to restore full access."
        : `Your ClinicOS subscription expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}. Renew now to avoid interruption.`;

      await supabase.from("notifications").insert({
        clinic_id: clinicId,
        title,
        message,
        type: daysLeft <= 3 ? "warning" : "info",
        created_at: new Date().toISOString(),
      });
    },

    async createExpiryNotification(clinicId) {
      await this.createReminderNotification(clinicId, 0);
    },

    async checkGracePeriodAndExpire() {
      const now = new Date().toISOString();

      const { data: expired } = await supabase
        .from("subscriptions")
        .select("id, clinic_id, status")
        .in("status", ["active", "trialing", "pending_payment", "grace_period"])
        .lte("current_period_end", now);

      const results = [];
      for (const sub of expired || []) {
        const graceEnd = sub.grace_period_ends_at ? new Date(sub.grace_period_ends_at) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        if (new Date() >= graceEnd) {
          await supabase.from("subscriptions").update({
            status: "suspended",
            updated_at: now,
          }).eq("id", sub.id);

          await this.createExpiryNotification(sub.clinic_id);

          audit.log({
            clinic_id: sub.clinic_id,
            user_id: null,
            action: "Subscription Suspended",
            entity_type: "subscriptions",
            entity_id: sub.id,
          }).catch(() => {});

          results.push({ clinicId: sub.clinic_id, action: "suspended" });
        } else if (sub.status !== "past_due") {
          await supabase.from("subscriptions").update({
            status: "past_due",
            updated_at: now,
          }).eq("id", sub.id);

          results.push({ clinicId: sub.clinic_id, action: "past_due" });
        }
      }

      return results;
    },
  };
}

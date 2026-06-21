import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();
    const results: Record<string, unknown>[] = [];

    // --- Step 1: Check grace periods and suspend expired subscriptions ---
    const REMINDER_DAYS = [14, 7, 3, 1];

    // Notify about upcoming renewals
    const fourteenDays = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("id, clinic_id, status, current_period_end, grace_period_ends_at, trial_ends_at, plan_id")
      .in("status", ["active", "trialing"])
      .lte("current_period_end", fourteenDays);

    for (const sub of subs || []) {
      const daysLeft = Math.ceil((new Date(sub.current_period_end) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) continue;

      if (REMINDER_DAYS.includes(daysLeft)) {
        await supabase.from("notifications").insert({
          clinic_id: sub.clinic_id,
          title: daysLeft === 1 ? "Subscription Expires Tomorrow" : `Subscription Expires in ${daysLeft} Days`,
          message: `Your ClinicOS subscription expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}. Renew now to avoid interruption.`,
          type: daysLeft <= 3 ? "warning" : "info",
          created_at: now,
        });
        results.push({ clinicId: sub.clinic_id, action: "reminder", daysLeft });
      }
    }

    // --- Step 2: Suspend subscriptions past grace period ---
    const { data: expired } = await supabase
      .from("subscriptions")
      .select("id, clinic_id, status, grace_period_ends_at")
      .in("status", ["active", "trialing", "pending_payment", "past_due"])
      .lte("current_period_end", now);

    for (const sub of expired || []) {
      const graceEnd = sub.grace_period_ends_at
        ? new Date(sub.grace_period_ends_at)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      if (new Date() >= graceEnd) {
        await supabase.from("subscriptions").update({
          status: "suspended",
          updated_at: now,
        }).eq("id", sub.id);

        await supabase.from("notifications").insert({
          clinic_id: sub.clinic_id,
          title: "Subscription Suspended",
          message: "Your ClinicOS subscription has been suspended due to non-payment. Renew now to restore full access.",
          type: "warning",
          created_at: now,
        });

        results.push({ clinicId: sub.clinic_id, action: "suspended" });
      } else if (sub.status !== "past_due") {
        await supabase.from("subscriptions").update({
          status: "past_due",
          updated_at: now,
        }).eq("id", sub.id);

        results.push({ clinicId: sub.clinic_id, action: "past_due" });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

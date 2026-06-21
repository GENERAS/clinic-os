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

    // Build a map of clinic_id -> reminder_hours array
    // Priority: whatsapp_settings (new) over clinic_notification_settings (old)
    const clinicReminderHours = new Map<string, number[]>();

    // 1. Read from whatsapp_settings (new system)
    const { data: newSettings } = await supabase
      .from("whatsapp_settings")
      .select("clinic_id, reminders_enabled, reminder_hours")
      .eq("reminders_enabled", true);

    if (newSettings) {
      for (const s of newSettings) {
        if (s.reminder_hours && Array.isArray(s.reminder_hours)) {
          clinicReminderHours.set(s.clinic_id, s.reminder_hours);
        }
      }
    }

    // 2. Read from clinic_notification_settings (old system) — fallback
    const { data: oldSettings } = await supabase
      .from("clinic_notification_settings")
      .select("clinic_id, whatsapp_reminders_enabled, reminder_hours_before")
      .eq("whatsapp_reminders_enabled", true);

    if (oldSettings) {
      for (const s of oldSettings) {
        if (!clinicReminderHours.has(s.clinic_id) && s.reminder_hours_before) {
          clinicReminderHours.set(s.clinic_id, [s.reminder_hours_before]);
        }
      }
    }

    if (clinicReminderHours.size === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    let totalProcessed = 0;

    for (const [clinic_id, hoursBefore] of clinicReminderHours) {
      // For each reminder window, find appointments that need a reminder now
      for (const hours of hoursBefore) {
        const reminderTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
        const fromDate = reminderTime.toISOString().split("T")[0];
        const fromTime = reminderTime.toTimeString().split(":").slice(0, 2).join(":");

        const { data: appointments } = await supabase
          .from("appointments")
          .select("id, patient_id, appointment_date, start_time, patients!inner(full_name, phone)")
          .eq("status", "confirmed")
          .eq("appointment_date", fromDate)
          .gte("start_time", fromTime)
          .lte("start_time", fromTime + ":59")
          .is("deleted_at", null);

        if (!appointments) continue;

        const { data: clinic } = await supabase
          .from("clinics")
          .select("name")
          .eq("id", clinic_id)
          .single();

        const clinicName = clinic?.name || "Clinic";

        for (const apt of appointments) {
          const patient = apt.patients;
          if (!patient?.phone) continue;

          // Dedup: skip if reminder already queued for this appointment
          const { data: existing } = await supabase
            .from("whatsapp_messages")
            .select("id")
            .eq("appointment_id", apt.id)
            .eq("message_type", "appointment_reminder")
            .maybeSingle();

          if (existing) continue;

          const { data: template } = await supabase
            .from("whatsapp_templates")
            .select("content, name")
            .eq("clinic_id", clinic_id)
            .eq("template_type", "appointment_reminder")
            .eq("is_active", true)
            .maybeSingle();

          const content = template?.content
            ? template.content
                .replaceAll("{{patient_name}}", patient.full_name || "")
                .replaceAll("{{clinic_name}}", clinicName)
                .replaceAll("{{appointment_date}}", new Date(apt.appointment_date + "T00:00:00").toLocaleDateString())
                .replaceAll("{{appointment_time}}", apt.start_time?.substring(0, 5) || "")
            : `Reminder: ${patient.full_name}, you have an appointment at ${clinicName} on ${new Date(apt.appointment_date + "T00:00:00").toLocaleDateString()}`;

          const { data: newMsg } = await supabase
            .from("whatsapp_messages")
            .insert({
              clinic_id,
              patient_id: apt.patient_id,
              appointment_id: apt.id,
              phone_number: patient.phone,
              message_type: "appointment_reminder",
              message_template: template?.name || "default",
              message_content: content,
              status: "queued",
            })
            .select()
            .single();

          if (newMsg) {
            totalProcessed++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ processed: totalProcessed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

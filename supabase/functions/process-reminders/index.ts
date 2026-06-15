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

    // Get all clinics with WhatsApp enabled
    const { data: settings } = await supabase
      .from("clinic_notification_settings")
      .select("clinic_id, whatsapp_reminders_enabled, reminder_hours_before")
      .eq("whatsapp_reminders_enabled", true);

    if (!settings) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let totalProcessed = 0;

    for (const setting of settings) {
      const { clinic_id, reminder_hours_before } = setting;

      const now = new Date();
      const reminderTime = new Date(now.getTime() + reminder_hours_before * 60 * 60 * 1000);

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

    return new Response(JSON.stringify({ processed: totalProcessed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

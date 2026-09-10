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

    // Build a map of clinic_id -> reminder_hours arrays
    // Priority: whatsapp_settings (new) over clinic_notification_settings (old)
    const whatsappClinicReminderHours = new Map<string, number[]>();

    // 1. Read from whatsapp_settings (new system)
    const { data: newSettings } = await supabase
      .from("whatsapp_settings")
      .select("clinic_id, reminders_enabled, reminder_hours")
      .eq("reminders_enabled", true);

    if (newSettings) {
      for (const s of newSettings) {
        if (s.reminder_hours && Array.isArray(s.reminder_hours)) {
          whatsappClinicReminderHours.set(s.clinic_id, s.reminder_hours);
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
        if (!whatsappClinicReminderHours.has(s.clinic_id) && s.reminder_hours_before) {
          whatsappClinicReminderHours.set(s.clinic_id, [s.reminder_hours_before]);
        }
      }
    }

    // 3. Read SMS reminder settings
    const smsClinicReminderHours = new Map<string, number[]>();
    const { data: smsSettings } = await supabase
      .from("clinic_notification_settings")
      .select("clinic_id, sms_reminders_enabled, sms_reminder_hours_before")
      .eq("sms_reminders_enabled", true);

    if (smsSettings) {
      for (const s of smsSettings) {
        if (s.sms_reminder_hours_before) {
          smsClinicReminderHours.set(s.clinic_id, [s.sms_reminder_hours_before]);
        }
      }
    }

    const now = new Date();
    let totalProcessed = 0;

    const getAppointmentsInWindow = async (clinicId: string, hours: number) => {
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

      return appointments || [];
    };

    const getClinicName = async (clinicId: string) => {
      const { data: clinic } = await supabase
        .from("clinics")
        .select("name")
        .eq("id", clinicId)
        .single();
      return clinic?.name || "Clinic";
    };

    const reminderTemplate = (template: { content?: string; name?: string } | null) => ({
      content: template?.content || null,
      name: template?.name || "default",
    });

    const fetchTemplate = async (clinicId: string) => {
      const { data: template } = await supabase
        .from("whatsapp_templates")
        .select("content, name")
        .eq("clinic_id", clinicId)
        .eq("template_type", "appointment_reminder")
        .eq("is_active", true)
        .maybeSingle();
      return reminderTemplate(template);
    };

    const alreadyQueued = async (clinicId: string, appointmentId: string, provider: string) => {
      const { data: existing } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("appointment_id", appointmentId)
        .eq("message_type", "appointment_reminder")
        .eq("provider", provider)
        .maybeSingle();
      return !!existing;
    };

    const enqueueReminder = async (
      clinicId: string,
      clinicName: string,
      apt: { id: string; patient_id: string | null; appointment_date: string; start_time: string },
      patient: { full_name: string; phone: string },
      template: { content: string | null; name: string },
      provider: "meta" | "sms",
    ) => {
      const content = template.content
        ? template.content
            .replaceAll("{{patient_name}}", patient.full_name || "")
            .replaceAll("{{clinic_name}}", clinicName)
            .replaceAll("{{appointment_date}}", new Date(apt.appointment_date + "T00:00:00").toLocaleDateString())
            .replaceAll("{{appointment_time}}", apt.start_time?.substring(0, 5) || "")
        : `Reminder: ${patient.full_name}, you have an appointment at ${clinicName} on ${new Date(apt.appointment_date + "T00:00:00").toLocaleDateString()}`;

      const { data: newMsg } = await supabase
        .from("whatsapp_messages")
        .insert({
          clinic_id: clinicId,
          patient_id: apt.patient_id,
          appointment_id: apt.id,
          phone_number: patient.phone,
          message_type: "appointment_reminder",
          message_template: template.name,
          message_content: content,
          provider,
          status: "queued",
        })
        .select()
        .single();

      if (newMsg) totalProcessed++;
    };

    // ---- WhatsApp reminders ----
    for (const [clinicId, hoursBefore] of whatsappClinicReminderHours) {
      const clinicName = await getClinicName(clinicId);
      for (const hours of hoursBefore) {
        const appointments = await getAppointmentsInWindow(clinicId, hours);
        if (!appointments.length) continue;
        const template = await fetchTemplate(clinicId);
        for (const apt of appointments) {
          const patient = apt.patients;
          if (!patient?.phone) continue;
          if (await alreadyQueued(clinicId, apt.id, "meta")) continue;
          await enqueueReminder(clinicId, clinicName, apt, patient, template, "meta");
        }
      }
    }

    // ---- SMS reminders ----
    for (const [clinicId, hoursBefore] of smsClinicReminderHours) {
      const clinicName = await getClinicName(clinicId);
      for (const hours of hoursBefore) {
        const appointments = await getAppointmentsInWindow(clinicId, hours);
        if (!appointments.length) continue;
        const template = await fetchTemplate(clinicId);
        for (const apt of appointments) {
          const patient = apt.patients;
          if (!patient?.phone) continue;
          if (await alreadyQueued(clinicId, apt.id, "sms")) continue;
          await enqueueReminder(clinicId, clinicName, apt, patient, template, "sms");
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
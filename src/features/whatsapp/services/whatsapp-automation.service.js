import { createClient } from "@/lib/supabase/client";
import { getWhatsAppSimulationService } from "./whatsapp-simulation.service";

const DEFAULT_TEMPLATES = {
  appointment_confirmation: "Your appointment at {{clinic_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Reply 'RESCHEDULE' to change or 'CANCEL' to cancel.",
  appointment_reminder: "Reminder: {{patient_name}}, you have an appointment at {{clinic_name}} on {{appointment_date}} at {{appointment_time}}. Reply 'CONFIRM' to confirm, 'CANCEL' to cancel.",
  appointment_cancelled: "Your appointment at {{clinic_name}} on {{appointment_date}} at {{appointment_time}} has been cancelled. Reply 'BOOK' to book a new appointment.",
  appointment_rescheduled: "Your appointment has been rescheduled. New date: {{appointment_date}} at {{appointment_time}} at {{clinic_name}}.",
  follow_up: "Hi {{patient_name}}, how are you feeling today after your visit to {{clinic_name}}? Reply 'RATE' to share feedback.",
  medication_reminder: "Reminder: Take {{dosage}} of {{medicine}} as prescribed by {{doctor_name}}.",
  welcome_message: "Welcome to {{clinic_name}}! Reply with:\n1. Book Appointment\n2. Clinic Hours\n3. Directions\n4. Contact Reception",
  survey: "How was your visit to {{clinic_name}}? Rate 1-5 (1=Poor, 5=Excellent). Reply with a number.",
};

function renderTemplate(content, vars) {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value || "");
  }
  return result;
}

export function getWhatsAppAutomationService() {
  const supabase = createClient();
  const simulation = getWhatsAppSimulationService();

  async function getClinicSettings(clinicId) {
    const { data } = await supabase.from("whatsapp_settings").select("*").eq("clinic_id", clinicId).maybeSingle();
    return data || null;
  }

  async function ensureSettings(clinicId) {
    const existing = await getClinicSettings(clinicId);
    if (existing) return existing;
    const { data } = await supabase.from("whatsapp_settings").insert({ clinic_id: clinicId }).select().single();
    return data;
  }

  async function ensureDefaultTemplates(clinicId) {
    for (const [type, content] of Object.entries(DEFAULT_TEMPLATES)) {
      const { data: existing } = await supabase
        .from("whatsapp_templates")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("template_type", type)
        .maybeSingle();
      if (!existing) {
        await supabase.from("whatsapp_templates").insert({
          clinic_id: clinicId,
          name: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          template_type: type,
          content,
          is_active: true,
          is_default: true,
        });
      }
    }
  }

  async function queueAppointmentConfirmation(appointmentId) {
    const { data: apt } = await supabase
      .from("appointments")
      .select("id, patient_id, appointment_date, start_time, clinic_id, doctor_id")
      .eq("id", appointmentId)
      .single();
    if (!apt) return null;
    const { data: patient } = await supabase.from("patients").select("id, full_name, phone").eq("id", apt.patient_id).single();
    if (!patient?.phone) return null;
    const { data: clinic } = await supabase.from("clinics").select("name").eq("id", apt.clinic_id).single();
    if (!clinic) return null;
    const doctorName = apt.doctor_id ? await getDoctorName(apt.doctor_id) : "";
    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("content")
      .eq("clinic_id", apt.clinic_id)
      .eq("template_type", "appointment_confirmation")
      .eq("is_active", true)
      .maybeSingle();
    const content = renderTemplate(template?.content || DEFAULT_TEMPLATES.appointment_confirmation, {
      "{{patient_name}}": patient.full_name,
      "{{clinic_name}}": clinic.name,
      "{{appointment_date}}": new Date(apt.appointment_date + "T00:00:00").toLocaleDateString(),
      "{{appointment_time}}": (apt.start_time || "").substring(0, 5),
      "{{doctor_name}}": doctorName,
    });
    await simulation.sendMessage(apt.clinic_id, {
      patient_id: patient.id,
      appointment_id: apt.id,
      phone_number: patient.phone,
      message_type: "appointment_confirmation",
      message_template: "appointment_confirmation",
      message_content: content,
    });
    return { appointmentId, type: "confirmation" };
  }

  async function queueAppointmentReminder(appointmentId) {
    const { data: apt } = await supabase
      .from("appointments")
      .select("id, patient_id, appointment_date, start_time, clinic_id, doctor_id, status")
      .eq("id", appointmentId)
      .single();
    if (!apt || apt.status === "cancelled" || apt.status === "no_show") return null;
    const { data: existing } = await supabase
      .from("whatsapp_messages")
      .select("id")
      .eq("appointment_id", appointmentId)
      .eq("message_type", "appointment_reminder")
      .maybeSingle();
    if (existing) return null;
    const { data: patient } = await supabase.from("patients").select("id, full_name, phone").eq("id", apt.patient_id).single();
    if (!patient?.phone) return null;
    const { data: clinic } = await supabase.from("clinics").select("name").eq("id", apt.clinic_id).single();
    const doctorName = apt.doctor_id ? await getDoctorName(apt.doctor_id) : "";
    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("content")
      .eq("clinic_id", apt.clinic_id)
      .eq("template_type", "appointment_reminder")
      .eq("is_active", true)
      .maybeSingle();
    const content = renderTemplate(template?.content || DEFAULT_TEMPLATES.appointment_reminder, {
      "{{patient_name}}": patient.full_name,
      "{{clinic_name}}": clinic?.name || "",
      "{{appointment_date}}": new Date(apt.appointment_date + "T00:00:00").toLocaleDateString(),
      "{{appointment_time}}": (apt.start_time || "").substring(0, 5),
      "{{doctor_name}}": doctorName,
    });
    await simulation.sendMessage(apt.clinic_id, {
      patient_id: patient.id,
      appointment_id: apt.id,
      phone_number: patient.phone,
      message_type: "appointment_reminder",
      message_template: "appointment_reminder",
      message_content: content,
    });
    return { appointmentId, type: "reminder" };
  }

  async function queueAppointmentCancelled(appointmentId) {
    const { data: apt } = await supabase
      .from("appointments")
      .select("id, patient_id, appointment_date, start_time, clinic_id")
      .eq("id", appointmentId)
      .single();
    if (!apt) return null;
    const { data: patient } = await supabase.from("patients").select("id, full_name, phone").eq("id", apt.patient_id).single();
    if (!patient?.phone) return null;
    const { data: clinic } = await supabase.from("clinics").select("name").eq("id", apt.clinic_id).single();
    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("content")
      .eq("clinic_id", apt.clinic_id)
      .eq("template_type", "appointment_cancelled")
      .eq("is_active", true)
      .maybeSingle();
    const content = renderTemplate(template?.content || DEFAULT_TEMPLATES.appointment_cancelled, {
      "{{patient_name}}": patient.full_name,
      "{{clinic_name}}": clinic?.name || "",
      "{{appointment_date}}": new Date(apt.appointment_date + "T00:00:00").toLocaleDateString(),
      "{{appointment_time}}": (apt.start_time || "").substring(0, 5),
    });
    await simulation.sendMessage(apt.clinic_id, {
      patient_id: patient.id,
      appointment_id: apt.id,
      phone_number: patient.phone,
      message_type: "appointment_cancelled",
      message_template: "appointment_cancelled",
      message_content: content,
    });
    return { appointmentId, type: "cancellation" };
  }

  async function queueAppointmentRescheduled(appointmentId) {
    const { data: apt } = await supabase
      .from("appointments")
      .select("id, patient_id, appointment_date, start_time, clinic_id")
      .eq("id", appointmentId)
      .single();
    if (!apt) return null;
    const { data: patient } = await supabase.from("patients").select("id, full_name, phone").eq("id", apt.patient_id).single();
    if (!patient?.phone) return null;
    const { data: clinic } = await supabase.from("clinics").select("name").eq("id", apt.clinic_id).single();
    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("content")
      .eq("clinic_id", apt.clinic_id)
      .eq("template_type", "appointment_rescheduled")
      .eq("is_active", true)
      .maybeSingle();
    const content = renderTemplate(template?.content || DEFAULT_TEMPLATES.appointment_rescheduled, {
      "{{patient_name}}": patient.full_name,
      "{{clinic_name}}": clinic?.name || "",
      "{{appointment_date}}": new Date(apt.appointment_date + "T00:00:00").toLocaleDateString(),
      "{{appointment_time}}": (apt.start_time || "").substring(0, 5),
    });
    await simulation.sendMessage(apt.clinic_id, {
      patient_id: patient.id,
      appointment_id: apt.id,
      phone_number: patient.phone,
      message_type: "appointment_rescheduled",
      message_template: "appointment_rescheduled",
      message_content: content,
    });
    return { appointmentId, type: "rescheduled" };
  }

  async function queueFollowUp(appointmentId, followUpType = "check_in") {
    const { data: apt } = await supabase
      .from("appointments")
      .select("id, patient_id, clinic_id, appointment_date")
      .eq("id", appointmentId)
      .single();
    if (!apt) return null;
    const { data: patient } = await supabase.from("patients").select("id, full_name, phone").eq("id", apt.patient_id).single();
    if (!patient?.phone) return null;
    const { data: clinic } = await supabase.from("clinics").select("name").eq("id", apt.clinic_id).single();
    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("content")
      .eq("clinic_id", apt.clinic_id)
      .eq("template_type", "follow_up")
      .eq("is_active", true)
      .maybeSingle();
    const content = renderTemplate(template?.content || DEFAULT_TEMPLATES.follow_up, {
      "{{patient_name}}": patient.full_name,
      "{{clinic_name}}": clinic?.name || "",
    });
    await simulation.sendMessage(apt.clinic_id, {
      patient_id: patient.id,
      appointment_id: apt.id,
      phone_number: patient.phone,
      message_type: "follow_up",
      message_template: "follow_up",
      message_content: content,
    });
    if (followUpType === "survey") {
      await queueSurvey(apt.clinic_id, patient.id, apt.id);
    }
    return { appointmentId, type: followUpType };
  }

  async function queueSurvey(clinicId, patientId, appointmentId) {
    const { data: patient } = await supabase.from("patients").select("full_name, phone").eq("id", patientId).single();
    if (!patient?.phone) return null;
    const { data: clinic } = await supabase.from("clinics").select("name").eq("id", clinicId).single();
    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("content")
      .eq("clinic_id", clinicId)
      .eq("template_type", "survey")
      .eq("is_active", true)
      .maybeSingle();
    const content = renderTemplate(template?.content || DEFAULT_TEMPLATES.survey, {
      "{{patient_name}}": patient.full_name,
      "{{clinic_name}}": clinic?.name || "",
    });
    await simulation.sendMessage(clinicId, {
      patient_id: patientId,
      appointment_id: appointmentId,
      phone_number: patient.phone,
      message_type: "survey",
      message_template: "survey",
      message_content: content,
    });
    await supabase.from("whatsapp_surveys").insert({
      clinic_id: clinicId,
      patient_id: patientId,
      appointment_id: appointmentId,
      sent_at: new Date().toISOString(),
    });
  }

  async function queueMedicationReminder(reminderId) {
    const { data: rem } = await supabase
      .from("whatsapp_medication_reminders")
      .select("*, patients!inner(full_name, phone), clinics!inner(name)")
      .eq("id", reminderId)
      .single();
    if (!rem?.patients?.phone) return null;
    const doctorName = rem.created_by ? await getDoctorName(rem.created_by) : "";
    const content = renderTemplate(DEFAULT_TEMPLATES.medication_reminder, {
      "{{patient_name}}": rem.patients.full_name,
      "{{medicine}}": rem.medicine,
      "{{dosage}}": rem.dosage,
      "{{doctor_name}}": doctorName,
      "{{clinic_name}}": rem.clinics.name,
    });
    await simulation.sendMessage(rem.clinic_id, {
      patient_id: rem.patient_id,
      phone_number: rem.patients.phone,
      message_type: "medication_reminder",
      message_template: "medication_reminder",
      message_content: content,
    });
    return { reminderId };
  }

  async function getDoctorName(doctorId) {
    const { data } = await supabase.from("users").select("full_name").eq("id", doctorId).maybeSingle();
    return data?.full_name || "";
  }

  async function handleInboundBooking(clinicId, phoneNumber, messageText) {
    const text = (messageText || "").trim().toLowerCase();
    const { data: existing } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("phone_number", phoneNumber)
      .eq("session_status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    let conversation = existing;

    const getMenu = async () => {
      return `Welcome! Reply with:\n1. Book Appointment\n2. Clinic Hours\n3. Directions\n4. Contact Reception`;
    };

    if (!conversation) {
      await simulation.simulateInboundMessage(clinicId, phoneNumber, messageText, "inbound");
      const { data: clinic } = await supabase.from("clinics").select("name").eq("id", clinicId).single();
      const menuText = await getMenu();
      await simulation.sendMessage(clinicId, {
        phone_number: phoneNumber,
        message_type: "welcome_message",
        message_template: "welcome_message",
        message_content: `Welcome to ${clinic?.name || "the clinic"}!\n\n${menuText}`,
      });
      const { data: conv } = await supabase.from("whatsapp_conversations").insert({
        clinic_id: clinicId,
        phone_number: phoneNumber,
        session_status: "active",
        conversation_type: "general",
        current_step: "menu",
      }).select().single();
      conversation = conv;
      return { response: "menu", conversationId: conv?.id };
    }

    const step = conversation?.current_step || "menu";

    if (step === "menu") {
      if (text === "1" || text.includes("book")) {
        await supabase.from("whatsapp_conversations").update({ current_step: "booking_date", conversation_type: "booking" }).eq("id", conversation.id);
        const { data: clinic } = await supabase.from("clinics").select("name, phone, address").eq("id", clinicId).single();
        const dates = [];
        for (let i = 1; i <= 5; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          if (d.getDay() !== 0) {
            dates.push(`${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`);
          }
        }
        await simulation.sendMessage(clinicId, {
          phone_number: phoneNumber,
          message_type: "booking",
          message_template: "appointment_confirmation",
          message_content: `Available dates:\n${dates.map((d, i) => `${i + 1}. ${d}`).join("\n")}\n\nReply with the number for your preferred date.`,
        });
        return { response: "booking_date", conversationId: conversation.id };
      }
      if (text === "2" || text.includes("hour")) {
        const { data: hours } = await supabase
          .from("clinic_operating_hours")
          .select("day_of_week, open_time, close_time, is_open")
          .eq("clinic_id", clinicId)
          .order("day_of_week");
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const hoursText = (hours || []).map((h) =>
          `${dayNames[h.day_of_week % 7]}: ${h.is_open ? `${(h.open_time || "").substring(0, 5)} - ${(h.close_time || "").substring(0, 5)}` : "Closed"}`
        ).join("\n");
        await simulation.sendMessage(clinicId, {
          phone_number: phoneNumber,
          message_type: "clinic_hours",
          message_template: "clinic_hours",
          message_content: `Our hours:\n${hoursText}\n\nReply 'MENU' for main menu.`,
        });
        return { response: "hours", conversationId: conversation.id };
      }
      if (text === "3" || text.includes("direction")) {
        const { data: clinic } = await supabase.from("clinics").select("name, address").eq("id", clinicId).single();
        const address = clinic?.address || "Please call the clinic for directions.";
        const mapsUrl = clinic?.address ? `https://www.google.com/maps/search/${encodeURIComponent(clinic.address)}` : "";
        await simulation.sendMessage(clinicId, {
          phone_number: phoneNumber,
          message_type: "directions",
          message_template: "directions",
          message_content: `📍 ${clinic?.name}\n${address}${mapsUrl ? `\n\nView on Maps: ${mapsUrl}` : ""}\n\nReply 'MENU' for main menu.`,
        });
        return { response: "directions", conversationId: conversation.id };
      }
      if (text === "4" || text.includes("contact") || text.includes("reception")) {
        const { data: clinic } = await supabase.from("clinics").select("phone, email").eq("id", clinicId).single();
        const phone = clinic?.phone || "Not available";
        const email = clinic?.email || "Not available";
        await simulation.sendMessage(clinicId, {
          phone_number: phoneNumber,
          message_type: "contact",
          message_template: "contact",
          message_content: `📞 ${phone}\n📧 ${email}\n\nReply 'MENU' for main menu.`,
        });
        return { response: "contact", conversationId: conversation.id };
      }
      const menuText = await getMenu();
      await simulation.sendMessage(clinicId, {
        phone_number: phoneNumber,
        message_type: "welcome_message",
        message_template: "welcome_message",
        message_content: menuText,
      });
      return { response: "menu", conversationId: conversation.id };
    }

    if (step === "booking_date") {
      const dateIndex = parseInt(text) - 1;
      if (isNaN(dateIndex) || dateIndex < 0 || dateIndex > 4) {
        await simulation.sendMessage(clinicId, {
          phone_number: phoneNumber,
          message_type: "booking",
          message_template: "appointment_confirmation",
          message_content: "Please reply with a valid number (1-5) for your preferred date.",
        });
        return { response: "booking_date", conversationId: conversation.id };
      }
      const d = new Date();
      d.setDate(d.getDate() + dateIndex + 1);
      while (d.getDay() === 0) {
        d.setDate(d.getDate() + 1);
      }
      const selectedDate = d.toISOString().split("T")[0];

      const slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
      const { data: existingAppts } = await supabase
        .from("appointments")
        .select("start_time")
        .eq("clinic_id", clinicId)
        .eq("appointment_date", selectedDate)
        .in("status", ["scheduled", "confirmed", "arrived"]);
      const bookedSlots = new Set((existingAppts || []).map((a) => a.start_time));
      const availableSlots = slots.filter((s) => !bookedSlots.has(s));

      if (availableSlots.length === 0) {
        await simulation.sendMessage(clinicId, {
          phone_number: phoneNumber,
          message_type: "booking",
          message_template: "appointment_confirmation",
          message_content: "Sorry, no available slots on that date. Reply 'MENU' to try again.",
        });
        await supabase.from("whatsapp_conversations").update({ current_step: "menu" }).eq("id", conversation.id);
        return { response: "menu", conversationId: conversation.id };
      }

      await supabase.from("whatsapp_conversations").update({
        current_step: "booking_time",
        context: { ...conversation.context, selectedDate },
      }).eq("id", conversation.id);

      await simulation.sendMessage(clinicId, {
        phone_number: phoneNumber,
        message_type: "booking",
        message_template: "appointment_confirmation",
        message_content: `Available times on ${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}:\n${availableSlots.map((s, i) => `${i + 1}. ${s.substring(0, 5)}`).join("\n")}\n\nReply with the number.`,
      });
      return { response: "booking_time", conversationId: conversation.id };
    }

    if (step === "booking_time") {
      const timeIndex = parseInt(text) - 1;
      const d = new Date(conversation.context?.selectedDate + "T00:00:00");
      const dayOfWeek = d.getDay();
      const slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
      const { data: existingAppts } = await supabase
        .from("appointments")
        .select("start_time")
        .eq("clinic_id", clinicId)
        .eq("appointment_date", conversation.context?.selectedDate)
        .in("status", ["scheduled", "confirmed", "arrived"]);
      const bookedSlots = new Set((existingAppts || []).map((a) => a.start_time));
      const availableSlots = slots.filter((s) => !bookedSlots.has(s));

      if (isNaN(timeIndex) || timeIndex < 0 || timeIndex >= availableSlots.length) {
        await simulation.sendMessage(clinicId, {
          phone_number: phoneNumber,
          message_type: "booking",
          message_template: "appointment_confirmation",
          message_content: `Please reply with a valid number (1-${availableSlots.length}).`,
        });
        return { response: "booking_time", conversationId: conversation.id };
      }

      const selectedTime = availableSlots[timeIndex];
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("phone", phoneNumber)
        .maybeSingle();

      let patientId = patient?.id;
      if (!patientId) {
        const { data: newPatient } = await supabase.from("patients").insert({
          clinic_id: clinicId,
          full_name: "WhatsApp Patient",
          phone: phoneNumber,
        }).select().single();
        patientId = newPatient?.id;
      }

      if (patientId) {
        const { data: appointment } = await supabase.from("appointments").insert({
          clinic_id: clinicId,
          patient_id: patientId,
          appointment_date: conversation.context?.selectedDate,
          start_time: selectedTime,
          end_time: adjustTime(selectedTime, 30),
          status: "confirmed",
          source: "whatsapp",
        }).select().single();

        if (appointment) {
          await simulation.sendMessage(clinicId, {
            phone_number: phoneNumber,
            message_type: "appointment_confirmation",
            message_template: "appointment_confirmation",
            message_content: `✅ Appointment confirmed!\n📅 ${new Date(appointment.appointment_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}\n⏰ ${selectedTime.substring(0, 5)}\n\nReply 'MENU' for options or 'CANCEL' to cancel.`,
          });
          await queueAppointmentConfirmation(appointment.id);
        }
      }

      await supabase.from("whatsapp_conversations").update({
        session_status: "completed",
        ended_at: new Date().toISOString(),
      }).eq("id", conversation.id);
      return { response: "booked", conversationId: conversation.id };
    }

    if (step === "reschedule_choose") {
      const idx = parseInt(text) - 1;
      const appts = conversation.context?.appointments || [];
      if (isNaN(idx) || idx < 0 || idx >= appts.length) {
        await simulation.sendMessage(clinicId, {
          phone_number: phoneNumber,
          message_type: "reschedule",
          message_template: "reschedule",
          message_content: `Please reply with a valid number (1-${appts.length}).`,
        });
        return { response: "reschedule_choose", conversationId: conversation.id };
      }
      const selectedAppt = appts[idx];
      await supabase.from("whatsapp_conversations").update({
        current_step: "reschedule_date",
        context: { ...conversation.context, rescheduleAppointmentId: selectedAppt.id },
      }).eq("id", conversation.id);
      const d = new Date();
      const minDate = d.toISOString().split("T")[0];
      d.setDate(d.getDate() + 14);
      const maxDate = d.toISOString().split("T")[0];
      await simulation.sendMessage(clinicId, {
        phone_number: phoneNumber,
        message_type: "reschedule",
        message_template: "reschedule",
        message_content: `When would you like to reschedule to?\nReply with a date (YYYY-MM-DD) between ${minDate} and ${maxDate}.`,
      });
      return { response: "reschedule_date", conversationId: conversation.id };
    }

    if (step === "reschedule_date") {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(text.trim())) {
        await simulation.sendMessage(clinicId, {
          phone_number: phoneNumber,
          message_type: "reschedule",
          message_template: "reschedule",
          message_content: "Please reply with a valid date in YYYY-MM-DD format (e.g. 2026-07-15).",
        });
        return { response: "reschedule_date", conversationId: conversation.id };
      }
      await supabase.from("whatsapp_conversations").update({
        current_step: "reschedule_time",
        context: { ...conversation.context, rescheduleDate: text.trim() },
      }).eq("id", conversation.id);
      const slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
      const { data: existingAppts } = await supabase
        .from("appointments")
        .select("start_time")
        .eq("clinic_id", clinicId)
        .eq("appointment_date", text.trim())
        .in("status", ["scheduled", "confirmed", "arrived"]);
      const bookedSlots = new Set((existingAppts || []).map((a) => a.start_time));
      const availableSlots = slots.filter((s) => !bookedSlots.has(s));
      if (availableSlots.length === 0) {
        await simulation.sendMessage(clinicId, {
          phone_number: phoneNumber,
          message_type: "reschedule",
          message_template: "reschedule",
          message_content: "No available slots on this date. Please try a different date.\nReply with another date (YYYY-MM-DD).",
        });
        await supabase.from("whatsapp_conversations").update({ current_step: "reschedule_date" }).eq("id", conversation.id);
        return { response: "reschedule_date", conversationId: conversation.id };
      }
      await simulation.sendMessage(clinicId, {
        phone_number: phoneNumber,
        message_type: "reschedule",
        message_template: "reschedule",
        message_content: `Available times on ${text.trim()}:\n${availableSlots.map((s, i) => `${i + 1}. ${s.substring(0, 5)}`).join("\n")}\n\nReply with the number.`,
      });
      return { response: "reschedule_time", conversationId: conversation.id };
    }

    if (step === "reschedule_time") {
      const timeIndex = parseInt(text) - 1;
      const slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
      const { data: existingAppts } = await supabase
        .from("appointments")
        .select("start_time")
        .eq("clinic_id", clinicId)
        .eq("appointment_date", conversation.context?.rescheduleDate)
        .in("status", ["scheduled", "confirmed", "arrived"]);
      const bookedSlots = new Set((existingAppts || []).map((a) => a.start_time));
      const availableSlots = slots.filter((s) => !bookedSlots.has(s));
      if (isNaN(timeIndex) || timeIndex < 0 || timeIndex >= availableSlots.length) {
        await simulation.sendMessage(clinicId, {
          phone_number: phoneNumber,
          message_type: "reschedule",
          message_template: "reschedule",
          message_content: `Please reply with a valid number (1-${availableSlots.length}).`,
        });
        return { response: "reschedule_time", conversationId: conversation.id };
      }
      const selectedTime = availableSlots[timeIndex];
      await supabase
        .from("appointments")
        .update({
          appointment_date: conversation.context?.rescheduleDate,
          start_time: selectedTime,
          end_time: adjustTime(selectedTime, 30),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation.context?.rescheduleAppointmentId)
        .eq("clinic_id", clinicId);
      await simulation.sendMessage(clinicId, {
        phone_number: phoneNumber,
        message_type: "reschedule",
        message_template: "reschedule",
        message_content: `✅ Appointment rescheduled!\n📅 ${conversation.context?.rescheduleDate}\n⏰ ${selectedTime.substring(0, 5)}\n\nReply 'MENU' for options.`,
      });
      await supabase.from("whatsapp_conversations").update({
        session_status: "completed",
        ended_at: new Date().toISOString(),
      }).eq("id", conversation.id);
      return { response: "rescheduled", conversationId: conversation.id };
    }

    if ((step === "menu" || !step) && text.toLowerCase().includes("reschedule")) {
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, appointment_date, start_time")
        .eq("clinic_id", clinicId)
        .eq("patient_id", conversation.patient_id)
        .in("status", ["scheduled", "confirmed"])
        .order("appointment_date", { ascending: true })
        .limit(5);
      if (!appointments || appointments.length === 0) {
        await simulation.sendMessage(clinicId, {
          phone_number: phoneNumber,
          message_type: "reschedule",
          message_template: "reschedule",
          message_content: "You have no upcoming appointments to reschedule.\n\nReply 'MENU' for other options.",
        });
        return { response: "menu", conversationId: conversation.id };
      }
      await supabase.from("whatsapp_conversations").update({
        current_step: "reschedule_choose",
        context: { ...conversation.context, appointments: appointments.map(a => ({ id: a.id, date: a.appointment_date, time: a.start_time })) },
      }).eq("id", conversation.id);
      await simulation.sendMessage(clinicId, {
        phone_number: phoneNumber,
        message_type: "reschedule",
        message_template: "reschedule",
        message_content: `Your upcoming appointments:\n${appointments.map((a, i) => `${i + 1}. ${a.appointment_date} at ${a.start_time?.substring(0, 5)}`).join("\n")}\n\nReply with the number to reschedule.`,
      });
      return { response: "reschedule_choose", conversationId: conversation.id };
    }

    const menuText = await getMenu();
    await simulation.sendMessage(clinicId, {
      phone_number: phoneNumber,
      message_type: "welcome_message",
      message_template: "welcome_message",
      message_content: menuText,
    });
    return { response: "menu", conversationId: conversation.id };
  }

  function adjustTime(time, minutes) {
    const [h, m] = (time || "00:00").split(":").map(Number);
    const total = h * 60 + m + minutes;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  return {
    getClinicSettings,
    ensureSettings,
    ensureDefaultTemplates,
    queueAppointmentConfirmation,
    queueAppointmentReminder,
    queueAppointmentCancelled,
    queueAppointmentRescheduled,
    queueFollowUp,
    queueSurvey,
    queueMedicationReminder,
    handleInboundBooking,
    DEFAULT_TEMPLATES,
    renderTemplate,
  };
}

import { createClient } from "@/lib/supabase/client";

export function getSmsService() {
  const supabase = createClient();

  return {
    async send(clinicId, phoneNumber, messageText, context = {}) {
      const { data: msg, error } = await supabase.from("whatsapp_messages").insert({
        clinic_id: clinicId,
        patient_id: context.patient_id || null,
        appointment_id: context.appointment_id || null,
        phone_number: phoneNumber,
        message_type: context.message_type || "system_notification",
        message_template: context.message_template || "sms_fallback",
        message_content: messageText,
        provider: "sms",
        status: "sent",
        sent_at: new Date().toISOString(),
      }).select().single();

      if (error) throw error;
      return msg;
    },

    async sendBulk(clinicId, recipients, messageText) {
      const results = [];
      for (const r of recipients) {
        try {
          const result = await this.send(clinicId, r.phone, messageText, r.context);
          results.push({ phone: r.phone, success: true, id: result.id });
        } catch {
          results.push({ phone: r.phone, success: false });
        }
      }
      return results;
    },
  };
}
